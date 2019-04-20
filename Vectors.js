"use strict";

//Rotate a vector in the plane defined by itself and another vector
function vec_rot(v, k, t){
	const cos = Math.cos(t);
	const sin = Math.sin(t);

	return {
		x: v.x*cos + k.x*sin,
		y: v.y*cos + k.y*sin,
		z: v.z*cos + k.z*sin,
		w: v.w*cos + k.w*sin
	};
}

function normalize(v){
	const { x, y, z, w} = v;
	const len = Math.sqrt(x*x+y*y+z*z+w*w);
	return { x: x/len, y: y/len, z: z/len, w: w/len };
}

function orthogonalize(v,k){
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

function angle_between(v, k) {
    const dot = v.x*k.x + v.y*k.y + v.z*k.z + v.w*k.w;
    return Math.acos(dot);
}

module.exports = {
    vec_rot,
    normalize,
    orthogonalize,
    angle_between,
};