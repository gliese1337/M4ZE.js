import { Vec4, len2, vec_rot2, orthonorm, vec_add, reject, len } from "./Vectors";
import { ControlStates } from "./Controls";
import Maze from "./Maze";
import cast from "./Raycast";

const planes = { x: 'rgt', y: 'up', z: 'fwd', w: 'ana' };
const planeIndices = { x: 0, y: 1, z: 2, w: 3 };
const basis = [
  { x: 1, y: 0, z: 0, w: 0 },
  { x: 0, y: 1, z: 0, w: 0 },
  { x: 0, y: 0, z: 1, w: 0 },
  { x: 0, y: 0, z: 0, w: 1 },
];

const unit = { x: 0, y: 0, z: 0, w: 0 };

const turnRate = Math.PI / 2.75;

function rotArray(arr: Vec4[], count: number) {
  arr = arr.slice();
  count -= arr.length * Math.floor(count / arr.length);
  arr.push(...arr.splice(0, count));
  return arr;
}

export default class Player {
  public velocity: Vec4 = { x: 0, y: 0, z: 0, w: 0 };

  public fwd: Vec4;
  public rgt: Vec4;
  public up:  Vec4;
  public ana: Vec4;

  constructor(public pos: Vec4, ana: keyof Vec4) {
    [
      this.rgt,
      this.up,
      this.fwd,
      this.ana,
    ] = rotArray(basis, (planeIndices[ana] + 1) % 4);
  }

  rotate(v: keyof Vec4, k: keyof Vec4, angle: number, accelerating: boolean) {
    const vn = planes[v] as "rgt"|"fwd"|"up"|"ana";
    const kn = planes[k] as "rgt"|"fwd"|"up"|"ana";
 
    if (accelerating && (vn === "fwd" || kn === "fwd")) {
      const mag = reject(this.velocity, this.fwd);
      vec_rot2(this[vn], this[kn], angle);
      vec_add(this.velocity, mag, this.fwd);
    } else {
      vec_rot2(this[vn], this[kn], angle);
    }
  }

  renormalize() {
    const { rgt, up, fwd, ana } = this;
    orthonorm(fwd, []);
    orthonorm(rgt, [fwd]);
    orthonorm(up, [fwd, rgt]);
    orthonorm(ana, [fwd, rgt, up]);
  }

  translate(seconds: number, map: Maze) {
    const { pos, velocity: v } = this;
    let mag = Math.sqrt(len2(v));
    if (mag === 0) return false;

    do {
      const inc = mag * seconds;
      unit.x = v.x / mag;
      unit.y = v.y / mag;
      unit.z = v.z / mag;
      unit.w = v.w / mag;

      let { distance, norm } = cast(pos, unit, inc + 0.05, map);
      distance -= 0.01;

      if (distance < inc) {
        const scale = seconds * distance / inc;

        // Translate up to the point of impact
        vec_add(pos, scale, v);

        seconds -= scale;
        if (seconds <= 0) break;

        // Redirect the remaining motion along the surface
        reject(v, norm);
        mag = len(v);
      } else {
        vec_add(pos, seconds, v);
        break;
      }
    } while(mag > 0);

    const { size } = map;
    pos.x -= size * Math.floor(pos.x / size);
    pos.y -= size * Math.floor(pos.y / size);
    pos.z -= size * Math.floor(pos.z / size);
    pos.w -= size * Math.floor(pos.w / size);

    return true;
  }
 
  update_speed(controls: ControlStates, seconds: number) {
    const { velocity: v } = this;
    
    // Gravity
    //v.w -= 0.05 * seconds;

    const { mouseX: x, mouseY: y } = controls;
    const A = controls.mouse ? Math.max(0, 0.9 - (x*x+y*y)) : 1;
    vec_add(v, 0.75 * controls.fwdbak * A * seconds, this.fwd);

    const speed2 = len2(v);
    if (speed2 > .0001) {
      const speed = Math.sqrt(speed2);
      const C = controls.mouse ? 1.5 : // drag coefficient
        controls.fwdbak !== 0 ? 1 : 2;
      const scale = Math.max(speed - Math.pow(speed, 2 - 1/(speed + 1)) * C * seconds, 0) / speed;

      v.x *= scale;
      v.y *= scale;
      v.z *= scale;
      v.w *= scale;
    } else {
      v.x = 0;
      v.y = 0;
      v.z = 0;
      v.w = 0;
    }
  }

  private rot_plane(dir: number, u: keyof Vec4, v: keyof Vec4, angle: number, acc: boolean) {
    if (dir === 0) return false;
    if (dir < 0) [u, v] = [v, u];
    this.rotate(u, v, angle, acc);
    return true;
  }

  update(c: ControlStates, seconds: number, map: Maze) {
    const acc = c.fwdbak !== 0 || c.mouse;
    const angle = seconds * turnRate;
    let moved = false;

    moved = moved || this.rot_plane(c.pitc, 'z', 'y', angle, acc);
    moved = moved || this.rot_plane(c.zyaw, 'z', 'x', angle, acc);
    moved = moved || this.rot_plane(c.roll, 'x', 'y', angle, acc);
    moved = moved || this.rot_plane(c.wptc, 'z', 'w', angle, acc);
    moved = moved || this.rot_plane(c.wyaw, 'y', 'w', angle, acc);
    moved = moved || this.rot_plane(c.wrol, 'w', 'x', angle, acc);

    mouse: if (c.mouse) {
      const { mouseX: x, mouseY: y } = c;
      if (x * x + y * y > 1) break mouse;
      if (x !== 0) {
        this.rotate('z', 'x', x * Math.PI * seconds, true);
        moved = true;
      }
      if (y !== 0) {
        this.rotate('y', 'z', y * Math.PI * seconds, true);
        moved = true;
      }
    }
    
    if (moved) {
      this.renormalize();
    }
  
    this.update_speed(c, seconds);
    
    return this.translate(seconds, map) || moved;
  }
}
