function normalize(v){
	"use strict";
	const mag = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z+v.w*v.w);
	return { x: v.x/mag, y: v.y/mag, z: v.z/mag, w: v.w/mag };
}

function get_cell(map, x, y, z, w){
	"use strict";
	x %= map.size;
	y %= map.size;
	z %= map.size;
	w %= map.size;
	if(x < 0){ x += map.size; }
	if(y < 0){ y += map.size; }
	if(z < 0){ z += map.size; }
	if(w < 0){ w += map.size; }
	return map.grid[w][z][y][x];
}

// Find the distance to the next cell boundary
// for a particular vector component
function cast_comp(x, y, z, w, o){
	"use strict";
	let delta, s, m;
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
		s: s, m: m,
		d: Math.sqrt(delta*delta + y*y + z*z + w*w)
	};
}

// Starting from the player, we find the nearest gridlines
// in each dimension. We move to whichever is closer and
// check for a wall (inspect). Then we repeat until we've
// traced the entire length of the ray.
function cast(o, v, range, map) {
	"use strict";

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

	let value, dim, distance;
	do {// Find the next closest cell boundary
		// and increment distances appropriately
		if(xdist < ydist && xdist < zdist && xdist < wdist){		
			dim = 1*sx;
			mx += sx;
			distance = xdist;
			xdist += xdelta;
		}else if(ydist < zdist && ydist < wdist){
			dim = 2*sy;
			my += sy;
			distance = ydist;
			ydist += ydelta;
		}else if(zdist < wdist){
			dim = 3*sz;
			mz += sz;
			distance = zdist;
			zdist += zdelta;
		}else{
			dim = 4*sw;
			mw += sw;
			distance = wdist;
			wdist += wdelta;
		}

		value = get_cell(map, mx, my, mz, mw);
	} while(value !== 128 && distance < range);

	return {
		dim: dim,
		dist: distance
	};
}

module.exports = cast;