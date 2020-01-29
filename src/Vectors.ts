export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export function len2(v: Vec4) {
  return v.x*v.x+v.y*v.y+v.z*v.z+v.w*v.w;
}

export function len(v: Vec4) {
  return Math.hypot(v.x, v.y, v.z, v.w);
}

export function dot(v: Vec4, k: Vec4): number {
  return v.x*k.x+v.y*k.y+v.z*k.z+v.w*k.w;
}

export function reject(v: Vec4, unit: Vec4) {
  const a = dot(v, unit);

  v.x -= unit.x * a;
  v.y -= unit.y * a;
  v.z -= unit.z * a;
  v.w -= unit.w * a;

  return a;
}

export function vec_add(o: Vec4, dist: number, d: Vec4) {
  o.x += dist * d.x;
  o.y += dist * d.y;
  o.z += dist * d.z;
  o.w += dist * d.w;
}

export function fract(v: Vec4) {
  v.x -= Math.floor(v.x);
  v.y -= Math.floor(v.y);
  v.z -= Math.floor(v.z);
  v.w -= Math.floor(v.w);
}

//Destructively rotate a vector in the plane defined by itself and another vector
export function vec_rot(v: Vec4, k: Vec4, t: number) {
  const cos = Math.cos(t);
  const sin = Math.sin(t);

  v.x = v.x*cos + k.x*sin;
  v.y = v.y*cos + k.y*sin;
  v.z = v.z*cos + k.z*sin;
  v.w = v.w*cos + k.w*sin;
}

//Destructively rotate two vectors in the plane they define
export function vec_rot2(v: Vec4, k: Vec4, t: number) {
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const { x, y, z, w } = v;

  v.x = x*cos + k.x*sin;
  v.y = y*cos + k.y*sin;
  v.z = z*cos + k.z*sin;
  v.w = w*cos + k.w*sin;

  k.x = k.x*cos - x*sin;
  k.y = k.y*cos - y*sin;
  k.z = k.z*cos - z*sin;
  k.w = k.w*cos - w*sin;
}

export function rot_plane(v: Vec4, x: Vec4, y: Vec4, theta: number) {
  const vx = dot(v, x);
  const vy = dot(v, y);
  const ct1 = Math.cos(theta) - 1.0;
  const st = Math.sin(theta);
  const xcomp = vx * ct1 - vy * st;
  const ycomp = vy * ct1 + vx * st;
  v.x += x.x * xcomp + y.x * ycomp;
  v.y += x.y * xcomp + y.y * ycomp;
  v.z += x.z * xcomp + y.z * ycomp;
  v.w += x.w * xcomp + y.w * ycomp;
}

export function normalize(v: Vec4) {
  const len = Math.hypot(v.x, v.y, v.z, v.w);
  v.x /= len;
  v.y /= len;
  v.z /= len;
  v.w /= len;
}

export function orthonorm(v: Vec4, ks: Vec4[]) {
  let { x: vx, y: vy, z: vz, w: vw } = v;

  for (const { x: kx, y: ky, z: kz, w: kw } of ks) {
    const vk = vx*kx+vy*ky+vz*kz+vw*kw;

    vx -= kx*vk;
    vy -= ky*vk;
    vz -= kz*vk;
    vw -= kw*vk;
  }

  const len = Math.sqrt(vx*vx+vy*vy+vz*vz+vw*vw);

  v.x = vx / len;
  v.y = vy / len;
  v.z = vz / len;
  v.w = vw / len;
}

export function angle_between(v: Vec4, k: Vec4): number {
  return Math.acos(v.x*k.x + v.y*k.y + v.z*k.z + v.w*k.w);
}
