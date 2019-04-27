import { Vec4, normalize, dot, move_from, fract } from "./Vectors";
import Maze from "./Maze";

function get_cell(map: Maze, x: number, y: number, z: number, w: number){
    const { size } = map;
	x -= size*Math.floor(x/size);
	y -= size*Math.floor(y/size);
	z -= size*Math.floor(z/size);
	w -= size*Math.floor(w/size);
	return map.get(x, y, z, w);
}

function isectSphere(c: Vec4, r: number, o: Vec4, d: Vec4): number {
	const oc = { x: o.x - c.x, y: o.y - c.y, z: o.z - c.z, w: o.w - c.w };
	const loc = dot(d, oc);
	const det = loc*loc + r*r - dot(oc, oc);
	if(det < 0) return Infinity;
	const sqrtdet = Math.sqrt(det);
	return Math.min(sqrtdet - loc, -sqrtdet - loc);
}

// Find the distance to the next cell boundary
// for a particular vector component
function cast_comp(x: number, y: number, z: number, w: number, o: number){
    let delta: number;
    let s: number;
    let m: number;
	if(x > 0){
		s = 1;
		m = Math.floor(o);
		delta = m + 1.0 - o;
	}else{
		s = -1;
		m = Math.ceil(o - 1.0);
		delta = m - o;
	}

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
		cast_comp(v.x, v.y, v.z, v.w, o.x);
	
	let { d: ydist, s: sy, m: my } =
		cast_comp(v.y, v.x, v.z, v.w, o.y);

	let { d: zdist, s: sz, m: mz } =
		cast_comp(v.z, v.x, v.y, v.w, o.z);

	let { d: wdist, s: sw, m: mw } =
		cast_comp(v.w, v.x, v.y, v.z, o.w);

    let distance: number;
    let value: number;
	do {// Find the next closest cell boundary
		// and increment distances appropriately
		if(xdist < ydist && xdist < zdist && xdist < wdist){
			mx += sx;
			distance = xdist;
			xdist += xdelta;
		}else if(ydist < zdist && ydist < wdist){
			my += sy;
			distance = ydist;
			ydist += ydelta;
		}else if(zdist < wdist){
			mz += sz;
			distance = zdist;
			zdist += zdelta;
		}else{
			mw += sw;
			distance = wdist;
			wdist += wdelta;
		}

        value = get_cell(map, mx, my, mz, mw);
        
        if((value & 64) > 0){
            const center = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };
            const l = fract(move_from(o, distance, v));
            const isect = isectSphere(center, 0.5, l, v);
			if(isFinite(isect)) {
				return distance + isect;
			}
        }

	} while(value !== 128 && distance < range);

	return distance;
}