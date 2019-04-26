export interface Vec4 {
	x: number;
	y: number;
	z: number;
	w: number;
}

export function dot(v: Vec4, k: Vec4): number {
	return v.x*k.x+v.y*k.y+v.z*k.z+v.w*k.w;
}

export function move_from(o: Vec4, dist: number, d: Vec4) {
	return {
        x: o.x + dist * d.x,
        y: o.y + dist * d.y,
        z: o.z + dist * d.z,
        w: o.w + dist * d.w,
    };
}

export function fract(v: Vec4) {
	return {
		x: v.x - Math.floor(v.x),
		y: v.y - Math.floor(v.y),
		z: v.z - Math.floor(v.z),
		w: v.w - Math.floor(v.w),
	};
}

//Rotate a vector in the plane defined by itself and another vector
export function vec_rot(v: Vec4, k: Vec4, t: number): Vec4 {
	const cos = Math.cos(t);
	const sin = Math.sin(t);

	return {
		x: v.x*cos + k.x*sin,
		y: v.y*cos + k.y*sin,
		z: v.z*cos + k.z*sin,
		w: v.w*cos + k.w*sin
	};
}

export function normalize(v: Vec4): Vec4 {
	const { x, y, z, w} = v;
	const len = Math.sqrt(x*x+y*y+z*z+w*w);
	return { x: x/len, y: y/len, z: z/len, w: w/len };
}

export function orthogonalize(v: Vec4, k: Vec4): Vec4 {
    const { x: vx, y: vy, z: vz, w: vw } = v;
    const { x: kx, y: ky, z: kz, w: kw } = k;
    const vk = vx*kx+vy*ky+vz*kz+vw*kw;
    return {
        x: vx - kx*vk,
        y: vy - ky*vk,
        z: vz - kz*vk,
        w: vw - kw*vk
    };
}

export function angle_between(v: Vec4, k: Vec4): number {
    return Math.acos(v.x*k.x + v.y*k.y + v.z*k.z + v.w*k.w);
}
