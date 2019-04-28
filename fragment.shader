#version 300 es
precision mediump float;

uniform int SIZE;

uniform float u_depth;
uniform vec2 u_resolution;
uniform vec4 u_origin;
uniform vec4 u_rgt;
uniform vec4 u_up;
uniform vec4 u_fwd;

uniform vec3 u_seed;
uniform sampler2D u_colorscale;
uniform sampler2D u_map;

out vec4 outColor;

int get_cell(vec4 m){
	ivec4 i = ivec4(mod(m,float(SIZE)));
	float r = texelFetch(u_map, ivec2(i.z*SIZE+i.w, i.x*SIZE+i.y), 0).r;
	return int(r * 255.0);
}

/*
 * PROCEDURAL TEXTURE CODE
 */

/* Simplex Noise Algorithm */
vec4 permute(vec4 x){
	return mod(((x*34.0)+1.0)*x, 289.0);
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
	vec4 norm = inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
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
	v *= exp2(float(base));
	for(int i = 1; i < octaves; i++){
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
		v = vec3(
			v.x*v.x - v.y*v.y - v.z*v.z,
			2.0*v.x*v.y,
			2.0*v.x*v.z
		) + seed;

		if(dot(v,v) > 4.0){
			return float(i) / float(iter);
		}
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

	switch(dim){
	case 1:
		coords = ray.yzw;
		tint = red;
		h = julia(coords, u_seed);
		break;
	case 2:
		coords = ray.xzw;
		tint = green;
		h = julia(coords, u_seed);
		break;
	case 3:
		coords = ray.xyw;
		tint = blue;
		h = julia(coords, u_seed);
		break;
	default:
		coords = ray.xyz;
		tint = yellow;
		h = julia(coords, u_seed);
	}

	if(h == 0.0){
		return mix(tint/16.0, grey, layered_noise(coords, 3, 3));
	}

	vec3 base = texture(u_colorscale, vec2(h, 0.5)).rgb;
	return mix(tint/8.0, base, layered_noise(coords, 5, 3));
}

/* Flashlight Algorithm */
const float flashlight = 2.5;
float get_light(float x, float y, float dist, float tint){
	float t = atan(y, x);
	float g = exp(-t*t/0.25);
	float dm = flashlight*exp2(-dist); // Dim based on distance
	return min(2.0, dm * g + tint);
}

/*
 * RAYCASTING
 */

bool isectSphere(vec4 center, float r, vec4 lorigin, vec4 ldir, out vec4 isect) {
	vec4 oc = lorigin - center;
	float loc = dot(ldir, oc);
	float det = loc*loc + r*r - dot(oc, oc);
	if(det <= 0.0) return false;
	float sqrtdet = sqrt(det);
	float d = min(sqrtdet - loc, -sqrtdet - loc);
	isect = lorigin + d * ldir;
	return true;
}

// Find the distance to the next cell boundary
// for a particular vector component
float cast_comp(vec4 v, float o, out float sign, out float m){
	float delta;
	if(v.x > 0.0){
		sign = 1.0;
		m = floor(o);
		delta = m + 1.0 - o;
	}else{
		sign = -1.0;
		m = ceil(o - 1.0);
		delta = m - o;
	}

	return length(vec4(delta,delta*v.yzw/v.x));
}

// Starting from the player, we find the nearest gridlines
// in each dimension. We move to whichever is closer and
// check for a wall. Then we repeat until we've traced the
// entire length of the ray.
bool cast_vec(inout vec4 o, inout vec4 v, out int dim, inout float dist, float range, inout vec3 tints){

	v = normalize(v);

	// Inverting the elements of a normalized vector
	// gives the distance you have to move along that
	// vector to hit a cell boundary perpendicular
	// to that dimension.
	vec4 deltas = abs(vec4(1.0/v.x, 1.0/v.y, 1.0/v.z, 1.0/v.w));

	// Get the initial distances from the starting
	// point to the next cell boundaries.
	vec4 s, m;
	vec4 dists = vec4(
		cast_comp(v.xyzw, o.x, s.x, m.x),
		cast_comp(v.yxzw, o.y, s.y, m.y),
		cast_comp(v.zxyw, o.z, s.z, m.z),
		cast_comp(v.wxyz, o.w, s.w, m.w)
	);

	int value = get_cell(m);

	do {// Find the next closest cell boundary
		// and increment distances appropriately
		float inc;
		if(dists.x < dists.y && dists.x < dists.z && dists.x < dists.w){
			dim = 1;
			m.x += s.x;
			inc = dists.x - dist;
			dist = dists.x;
			dists.x += deltas.x;
		}else if(dists.y < dists.z && dists.y < dists.w){
			dim = 2;
			m.y += s.y;
			inc = dists.y - dist;
			dist = dists.y;
			dists.y += deltas.y;
		}else if(dists.z < dists.w){
			dim = 3;
			m.z += s.z;
			inc = dists.z - dist;
			dist = dists.z;
			dists.z += deltas.z;
		}else{
			dim = 4;
			m.w += s.w;
			inc = dists.w - dist;
			dist = dists.w;
			dists.w += deltas.w;
		}

		switch(value){
			case 1: tints.x += inc; // blue
			break;
			case 2:	tints.y += inc; // yellow
			break;
			case 3: tints.z += inc; // red
		}

		value = get_cell(m);
		
		if((value & 64) > 0){
			vec4 center = vec4(0.5);
			vec4 l = fract(o + dist * v);
			if(isectSphere(center, 0.5, l, v, o)) {
				v = reflect(l, normalize(o - center));
				return true;
			}
		}

	} while(value != 128 && dist < range);

	return false;
}

const float range = 10.0;

void main(){
	if ((get_cell(u_origin) & 128) == 128) {
		outColor = vec4(vec3(0), 1.0);
		return;
	}

	vec2 coords = gl_FragCoord.xy - (u_resolution / 2.0);
	vec4 ray = u_fwd*u_depth + u_rgt*coords.x + u_up*coords.y;
	
	vec4 o = mod(u_origin, float(SIZE));
	vec4 v = ray;

	vec3 tints = vec3(0);
	float dist = 0.0;
	int dim;

	bool reflected;
	do reflected = cast_vec(o, v, dim, dist, range, tints);
	while(reflected);

	v = o + dist * v;
	vec3 tex = dist >= range ? vec3(0) : calc_tex(dim, v);

	float tintdist = length(tints);
	if(tintdist > 0.0){
		tints = tints / tintdist;

		vec3 tint = vec3(0.0,0.0,1.0)*tints.x
				+ vec3(0.71,0.71,0.0)*tints.y
				+ vec3(1.0,0.0,0.0)*tints.z;

		tex = mix(tex, tint, min(tintdist, 0.5)); 
	}

	float light = get_light(u_depth, length(coords), dist, tintdist);
	outColor = vec4(min(tex * light, 1.0), 1.0);
}
