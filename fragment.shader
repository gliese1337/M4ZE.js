precision mediump float;

const int SIZE = 5;
const int SIZE2 = SIZE*SIZE;
const int SIZE3 = SIZE*SIZE2;
const int SIZE4 = SIZE*SIZE3;

uniform float u_depth;
uniform vec2 u_resolution;
uniform vec4 u_origin;
uniform vec4 u_rgt;
uniform vec4 u_up;
uniform vec4 u_fwd;

uniform vec3 u_seed;
uniform sampler2D u_colorscale;

uniform int u_map[SIZE4];

struct int4 {
	int x;
	int y;
	int z;
	int w;
};

int get_cell(int x, int y, int z, int w){
	x = int(mod(float(x),float(SIZE)));
	y = int(mod(float(y),float(SIZE)));
	z = int(mod(float(z),float(SIZE)));
	w = int(mod(float(w),float(SIZE)));

	// have to use constant indexing...
	// All of this is just to get x, y, & z
	// into loop indices to satisfy the compiler
	for(int ix = 0; ix < SIZE; ix++){
		if(ix != x){ continue; }
		for(int iy = 0; iy < SIZE; iy++){
			if(iy != y){ continue; }
			for(int iz = 0; iz < SIZE; iz++){
				if(iz != z){ continue; }
				for(int iw = 0; iw < SIZE; iw++){
					if(iw != w){ continue; }
					return u_map[ix*SIZE3+iy*SIZE2+iz*SIZE+iw];
				}
			}
		}
	}
	return 0;
}

/*
 * PROCEDURAL TEXTURE CODE
 */

/* Simplex Noise Algorithm */
vec4 permute(vec4 x){
	return mod(((x*34.0)+1.0)*x, 289.0);
}

vec4 fastInvSqrt(vec4 r){
	return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v){
	const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

	// First corner
	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx) ;

	// Other corners
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);

	vec3 x1 = x0 - i1 + C.x;
	vec3 x2 = x0 - i2 + C.y;
	vec3 x3 = x0 - D.y;

	i = mod(i,289.0);
	vec4 p = permute( permute( permute(
			 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
		   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
		   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

	float n_ = 1.0/7.0;
	vec3  ns = n_ * D.wyz - D.xzx;

	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_ );

	vec4 x = x_ *ns.x + ns.y;
	vec4 y = y_ *ns.x + ns.y;
	vec4 h = 1.0 - abs(x) - abs(y);

	vec4 b0 = vec4( x.xy, y.xy );
	vec4 b1 = vec4( x.zw, y.zw );

	vec4 s0 = floor(b0)*2.0 + 1.0;
	vec4 s1 = floor(b1)*2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));

	vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
	vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

	vec3 p0 = vec3(a0.xy,h.x);
	vec3 p1 = vec3(a0.zw,h.y);
	vec3 p2 = vec3(a1.xy,h.z);
	vec3 p3 = vec3(a1.zw,h.w);

	//Normalise gradients
	vec4 norm = fastInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;

	// Mix final noise value
	vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
	m = m*m;
	return 40.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float layered_noise(vec3 v, int base, int octaves){
	float acc = 0.0;
	v *= pow(2.0, float(base));
	for(int i = 1; i < 1000; i++){
		if(i > octaves) break; //loops can't use non-constant expressions
		acc += snoise(v);
		v *= 2.0;
	}
	return acc / float(octaves);
}

/* 3D modification of Julia fractal */
float julia(vec3 v, vec3 seed) {
	const int iter = 10;

	v = v*2.0 - 1.0;
	for(int i = 0; i < iter; i++){
		float x = (v.x*v.x - v.y*v.y - v.z*v.z) + seed.x;
		float y = (2.0*v.x*v.y) + seed.y;
		float z = (2.0*v.x*v.z) + seed.z;

		if((x * x + y * y + z * z) > 4.0){
			return float(i) / float(iter);
		}

		v.x = x;
		v.y = y;
		v.z = z;
	}

	return 0.0;
}

/* Main Texture Calculation */
const vec3 grey = vec3(0.2);
const vec3 red = vec3(1.0,0.5,0.5);
const vec3 green = vec3(0.5,1.0,0.5);
const vec3 blue = vec3(0.5,0.5,1.0);
const vec3 yellow = vec3(0.71,0.71,0.5);

vec3 calc_tex(int dim, vec4 ray){
	ray = fract(ray);
	vec3 coords, tint;
	float h;

	if(dim == 1 || dim == -1){
		coords = ray.yzw;
		tint = red;
		h = julia(coords, u_seed);
	}
	else if(dim == 2 || dim == -2){
		coords = ray.xzw;
		tint = green;
		h = julia(coords, u_seed);
	}
	else if(dim == 3 || dim == -3){
		coords = ray.xyw;
		tint = blue;
		h = julia(coords, u_seed);
	}
	else if(dim == 4 || dim == -4){
		coords = ray.xyz;
		tint = yellow;
		h = julia(coords, u_seed);
	}

	if(h == 0.0){
		return mix(tint/16.0, grey, layered_noise(coords, 3, 3));
	}

	vec3 base = texture2D(u_colorscale, vec2(h, 0.5)).rgb;
	return mix(tint/8.0, base, layered_noise(coords, 5, 3));
}

/* Flashlight Algorithm */
const float light_angle = 40.0;
const float light_mult = 5.0;
vec3 add_light(vec4 fwd, vec4 v, vec3 color, int dim, float distance){
	float t = degrees(acos(dot(fwd, v)));
	if(t > light_angle){ return color; }

	// Dim based on distance
	float dm = light_mult / pow(2.0, distance);

	// Dim based on incidence angle
	float am;
	if     (dim == 1 || dim == -1){ am = abs(v.x); }
	else if(dim == 2 || dim == -2){ am = abs(v.y); }
	else if(dim == 3 || dim == -3){ am = abs(v.z); }
	else if(dim == 4 || dim == -4){ am = abs(v.w); }

	float mult = 1.0 + dm * am * (1.0 - (t / light_angle));
	return min(color * mult, 1.0);
}

/*
 * RAYCASTING
 */

// Find the distance to the next cell boundary
// for a particular vector component
float cast_comp(vec4 v, float o, out int sign, out int m){
	float delta, fm;
	if(v.x > 0.0){
		sign = 1;
		fm = floor(o);
		delta = fm + 1.0 - o;
	}else{
		sign = -1;
		fm = ceil(o - 1.0);
		delta = fm - o;
	}

	m = int(fm);
	return length(vec4(delta,delta*v.yzw/v.x));
}

// Starting from the player, we find the nearest gridlines
// in each dimension. We move to whichever is closer and
// check for a wall. Then we repeat until we've traced the
// entire length of the ray.
vec3 cast_vec(vec4 o, vec4 v, float range){

	v = normalize(v);

	// Inverting the elements of a normalized vector
	// gives the distance you have to move along that
	// vector to hit a cell boundary perpendicular
	// to that dimension.
	vec4 deltas = abs(vec4(1.0/v.x, 1.0/v.y, 1.0/v.z, 1.0/v.w));

	// Get the initial distances from the starting
	// point to the next cell boundaries.
	int4 s, m;
	vec4 dists = vec4(
		cast_comp(v.xyzw, o.x, s.x, m.x),
		cast_comp(v.yxzw, o.y, s.y, m.y),
		cast_comp(v.zxyw, o.z, s.z, m.z),
		cast_comp(v.wxyz, o.w, s.w, m.w)
	);

	// Keep track of total distance,
	// and distance in colored cells.
	float distance = 0.0;
	float bluefrac = 0.0;
	float yellowfrac = 0.0;
	float redfrac = 0.0;

	int dim, value;

	// while loops are not allowed, so we have to use
	// a for loop with a fixed max number of iterations
	for(int i = 0; i < 1000; i++){
		// Find the next closest cell boundary
		// and increment distances appropriately
		float inc;
		if(dists.x < dists.y && dists.x < dists.z && dists.x < dists.w){
			dim = 1*s.x;
			m.x += s.x;
			inc = dists.x - distance;
			distance = dists.x;
			dists.x += deltas.x;
		}else if(dists.y < dists.z && dists.y < dists.w){
			dim = 2*s.y;
			m.y += s.y;
			inc = dists.y - distance;
			distance = dists.y;
			dists.y += deltas.y;
		}else if(dists.z < dists.w){
			dim = 3*s.z;
			m.z += s.z;
			inc = dists.z - distance;
			distance = dists.z;
			dists.z += deltas.z;
		}else{
			dim = 4*s.w;
			m.w += s.w;
			inc = dists.w - distance;
			distance = dists.w;
			dists.w += deltas.w;
		}

		value = get_cell(m.x, m.y, m.z, m.w);
		if(value == 1){
			bluefrac += inc;
		}else if(value == 2){
			yellowfrac += inc;
		}else if(value == 3){
			redfrac += inc;
		}

		if(value == 255 || distance >= range){
			break;
		}
	}

	vec4 ray = o + distance *  v;
	vec3 tex = calc_tex(dim, ray);

	float clear = distance - yellowfrac - bluefrac - redfrac;

	clear /= distance;
	yellowfrac /= distance;
	bluefrac /= distance;
	redfrac /= distance;

	tex = tex*clear
		+ vec3(0.71,0.71,0.0)*yellowfrac
		+ vec3(0.0,0.0,1.0)*bluefrac
		+ vec3(1.0,0.0,0.0)*redfrac;

	tex = add_light(u_fwd, v, tex, dim, distance);

	return tex;
}

void main(){
	vec4 cell = floor(u_origin);
	if(get_cell(int(cell.x), int(cell.y), int(cell.z), int(cell.w)) == 255){
		gl_FragColor = vec4(0,0,0,1);
		return;
	}

	vec2 coords = gl_FragCoord.xy - (u_resolution / 2.0);
	vec4 ray = u_fwd*u_depth + u_rgt*coords.x + u_up*coords.y;

	vec3 color = cast_vec(u_origin, ray, 10.0);
	gl_FragColor = vec4(color, 1.0);
}
