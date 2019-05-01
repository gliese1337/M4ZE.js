import { Vec4, normalize, dot, vec_add, fract } from "./Vectors";
import Maze from "./Maze";

function isectSphere(c: Vec4, r: number, o: Vec4, d: Vec4): number {
  const oc = { x: o.x - c.x, y: o.y - c.y, z: o.z - c.z, w: o.w - c.w };
  const loc = dot(d, oc);
  const det = loc*loc + r*r - dot(oc, oc);
  if (det < 0) return Infinity;
  const sqrtdet = Math.sqrt(det);
  return Math.min(sqrtdet - loc, -sqrtdet - loc);
}

// Find the distance to the next cell boundary
// for a particular vector component
function cast_comp(x: number, y: number, z: number, w: number, o: number, size: number) {
    let delta: number;
    let s: number;
    let m: number;
  if (x > 0) {
    s = 1;
    m = Math.floor(o);
    delta = m + 1.0 - o;
  } else {
    s = size - 1;
    m = Math.ceil(o - 1.0);
    delta = m - o; 
  }

  m -= size * Math.floor(m/size);

  const scale = delta/x;
  y = y*scale||0;
  z = z*scale||0;
  w = w*scale||0;

  return {
    s, m,
    d: Math.sqrt(delta*delta + y*y + z*z + w*w)
  };
}

// Starting from the player, we find the nearest gridlines
// in each dimension. We move to whichever is closer and
// check for a wall (inspect). Then we repeat until we've
// traced the entire length of the ray.
export default function cast(o: Vec4, v: Vec4, range: number, map: Maze) {
  const { size } = map;

  v = normalize(v);
    
  // Inverting the elements of a normalized vector
  // gives the distance you have to move along that
  // vector to hit a cell boundary perpendicular
  // to that dimension.
  const xdelta = Math.abs(1/v.x);
  const ydelta = Math.abs(1/v.y);
  const zdelta = Math.abs(1/v.z);
  const wdelta = Math.abs(1/v.w);

  // Get the initial distances from the starting
  // point to the next cell boundaries.
  let { d: xdist, s: sx, m: mx } =
    cast_comp(v.x, v.y, v.z, v.w, o.x, size);
  
  let { d: ydist, s: sy, m: my } =
    cast_comp(v.y, v.x, v.z, v.w, o.y, size);

  let { d: zdist, s: sz, m: mz } =
    cast_comp(v.z, v.x, v.y, v.w, o.z, size);

  let { d: wdist, s: sw, m: mw } =
    cast_comp(v.w, v.x, v.y, v.z, o.w, size);

  const m: Vec4 = { x: mx, y: my, z: mz, w: mw };

  let distance: number;
    let value: number;
  do {// Find the next closest cell boundary
    // and increment distances appropriately
    if (xdist < ydist && xdist < zdist && xdist < wdist) {
      m.x = (m.x + sx) % size;
      distance = xdist;
      xdist += xdelta;
    } else if (ydist < zdist && ydist < wdist) {
      m.y = (m.y + sy) % size;
      distance = ydist;
      ydist += ydelta;
    } else if (zdist < wdist) {
      m.z = (m.z + sz) % size;
      distance = zdist;
      zdist += zdelta;
    } else {
      m.w = (m.w + sw) % size;
      distance = wdist;
      wdist += wdelta;
    }

        value = map.get(m);
        
        if ((value & 64) > 0) {
            const center = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };
            const l = fract(vec_add(o, distance, v));
            const isect = isectSphere(center, 0.5, l, v);
      if (isFinite(isect)) {
        return distance + isect;
      }
        }

  } while(value !== 128 && distance < range);

  return distance;
}