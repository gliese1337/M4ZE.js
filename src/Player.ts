import { Vec4, vec_rot, normalize, orthogonalize, len2, project, vec_add } from "./Vectors";
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

const turnRate = Math.PI / 2.75;

function rotArray(arr: Vec4[], count: number) {
  arr = arr.slice();
  count -= arr.length * Math.floor(count / arr.length);
  arr.push(...arr.splice(0, count));
  return arr;
}

export default class Player implements Vec4 {
  public velocity: Vec4 = { x: 0, y: 0, z: 0, w: 0 };

  public x: number;
  public y: number;
  public z: number;
  public w: number;

  public fwd: Vec4;
  public rgt: Vec4;
  public up: Vec4;
  public ana: Vec4;

  constructor({ x, y, z, w }: Vec4, ana: keyof Vec4) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;

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
    const x = this[vn];
    const y = this[kn];
    
    if (accelerating && (vn === "fwd" || kn === "fwd")) {
      const [ p, mag ] = project(this.velocity, this.fwd);
      this.velocity = vec_add(this.velocity, -1, p);

      this[vn] = vec_rot(x, y, angle);
      this[kn] = vec_rot(y, x, -angle);

      this.velocity = vec_add(this.velocity, mag, this.fwd);
    } else {
      this[vn] = vec_rot(x, y, angle);
      this[kn] = vec_rot(y, x, -angle);
    }
  }

  renormalize() {
    let { rgt, up, fwd, ana } = this;
    fwd = normalize(fwd);
    this.fwd = fwd;
    rgt = normalize(orthogonalize(rgt, fwd));
    this.rgt = rgt;
    up = normalize(orthogonalize(orthogonalize(up, fwd), rgt));
    this.up = up;
    ana = normalize(orthogonalize(orthogonalize(orthogonalize(ana, fwd), rgt), up));
    this.ana = ana;
  }

  translate(seconds: number, map: Maze) {
    const { velocity } = this;

    const inc = Math.sqrt(len2(velocity)) * seconds;
    const dist = cast(this, velocity, inc + 0.05, map) - 0.001;
    const scale = dist < inc ? seconds * dist / inc : seconds;

    this.x += velocity.x * scale;
    this.y += velocity.y * scale;
    this.z += velocity.z * scale;
    this.w += velocity.w * scale;
    
    return true;
  }
 
  update_speed(controls: ControlStates, seconds: number) {
    const C = controls.mouse ? 4 : // drag coefficient
      (controls.fwd || controls.bak) ? 2 : 15;

    const { velocity: v } = this;
    const speed2 = len2(v);
    if (speed2 > .0001) {
      const speed = Math.sqrt(speed2);
      console.log(speed);
      const scale = Math.max(speed - speed2 * C * seconds, 0) / speed;

      v.x *= scale;
      v.y *= scale;
      v.z *= scale;
      v.w *= scale;
    }

    if (controls.fwd) {
      this.velocity = vec_add(v, 0.75 * seconds, this.fwd);
    } else if (controls.bak) {
	    this.velocity = vec_add(v, -0.75 * seconds, this.fwd);
    }

    if (len2(this.velocity) < .0001) {
      this.velocity = { x: 0, y: 0, z: 0, w: 0 };
    }
  }

  update(controls: ControlStates, seconds: number, map: Maze) {
    const accelerating = controls.fwd || controls.bak || controls.mouse;
    const angle = seconds * turnRate;
    let moved = false;
	
    if (controls.pup) {
        this.rotate(controls.vp, controls.kp, angle, accelerating);
        moved = true;
    }
    else if (controls.pdn) {
      this.rotate(controls.kp, controls.vp, angle, accelerating);
      moved = true;
    }
    
    if (controls.yrt) {
      this.rotate(controls.vy, controls.ky, angle, accelerating);
      moved = true;
    }
    else if (controls.ylt) {
      this.rotate(controls.ky, controls.vy, angle, accelerating);
      moved = true;
    }
    
    if (controls.rrt) {
      this.rotate(controls.vr, controls.kr, angle, accelerating);
      moved = true;
    }
    else if (controls.rlt) {
      this.rotate(controls.kr, controls.vr, angle, accelerating);
      moved = true;
    }
    
    if (controls.mouse) {
      const { clipX: x, clipY: y } = controls;
      moved = true;
      if (x !== 0) {
        this.rotate(controls.vy, controls.ky, x * angle, true);
      }
      if (y !== 0) {
        this.rotate(controls.kp, controls.vp, y * angle, true);
      }
    }
    
    if (moved) {
      this.renormalize();
    }
  
    this.update_speed(controls, seconds);
    
    return this.translate(seconds, map) || moved;
  }
}
