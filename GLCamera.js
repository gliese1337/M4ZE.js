const cast = require("./Raycast.js");
const GL_Utils = require("./webgl-utils.js");

function Camera(canvas, map, hfov){
	const gl = canvas.getContext("webgl2");
	let depth = canvas.width/(2*Math.tan(hfov/2));

	this.gl = gl;
	this.canvas = canvas;
	this.program = null;
	this.mapdata = map.flatten();
	this.mapsize = map.size;

	this.locs = {};

	Object.defineProperties(this, {
		map: {
			get: () => map,
			set: function(nm){
				map = nm;
				gl.uniform1iv(this.locs.map, map.flatten());
			}
		},
		
		fov: {
			get: () => hfov,
			set: function(a){
				hfov = a;
				depth = canvas.width/(2*Math.tan(hfov/2));
				gl.uniform1f(this.locs.depth, depth);
			}
		},
		
		depth: {
			get: () => depth,
			set: function(d){
				depth = d;
				hfov = 2*Math.atan(canvas.width/(2*d));
				gl.uniform1f(this.locs.depth, depth);
			}
		}
	});
	
	// Create a buffer and put a single rectangle in it
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1,	1, -1,	-1, 1,
		1, -1,	-1, 1,	1, 1,
	]), gl.STATIC_DRAW);

	// compile the shaders and link into a program
	const promise = GL_Utils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"])
	.then((program) => {

		this.program = program;

		// look up where the vertex data needs to go.
		const posAttrLoc = gl.getAttribLocation(program, "a_position");

		// Turn on the attribute
		gl.enableVertexAttribArray(posAttrLoc);

		// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
		gl.vertexAttribPointer(
			posAttrLoc,
			2,			// size, 2 components per iteration
			gl.FLOAT,	// type, 32bit floats
			false,		// norm, don't normalize data
			0,			// stride, don't skip anything
			0			// offset
		);

		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.useProgram(program);

		// look up uniform locations
		const locs = {
			size: gl.getUniformLocation(program, "SIZE"),
			map: gl.getUniformLocation(program, "u_map"),
			color: gl.getUniformLocation(program, "u_colorscale"),
			res: gl.getUniformLocation(program, "u_resolution"),
			depth: gl.getUniformLocation(program, "u_depth"),
			origin: gl.getUniformLocation(program, "u_origin"),
			rgt: gl.getUniformLocation(program, "u_rgt"),
			up: gl.getUniformLocation(program, "u_up"),
			fwd: gl.getUniformLocation(program, "u_fwd"),
			seed: gl.getUniformLocation(program, "u_seed")
		};

		this.locs = locs;

		// Set cross-frame constant uniforms
		gl.uniform2f(locs.res, canvas.width, canvas.height);
		gl.uniform1f(locs.depth, canvas.width/(2*Math.tan(hfov/2)));
		gl.uniform3f(locs.seed, Math.random()-0.5, Math.random()-0.5, Math.random()-0.5);
		gl.uniform1i(locs.size, this.mapsize);
		gl.uniform1i(locs.map, 0);

		const tex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.mapdata.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);

		//load textures
		gl.uniform1i(locs.color, 1);
		return new Promise(function(resolve){
			const image = new Image();
			image.src = "colorscale.png";
			image.addEventListener("load",function(){
				const tex = gl.createTexture();
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
					gl.UNSIGNED_BYTE, image
				);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				resolve();
			});
		});
	});

	this.onready = promise.then.bind(promise);
}

Camera.prototype.getRay = function(player, cx = 0, cy = 0){
	const depth = this.depth;
	const { fwd, rgt, up } = player;

	return {
		x: fwd.x * depth + rgt.x * cx + up.x * cy,
		y: fwd.y * depth + rgt.y * cx + up.y * cy,
		z: fwd.z * depth + rgt.z * cx + up.z * cy,
		w: fwd.w * depth + rgt.w * cx + up.z * cy
	};
};

Camera.prototype.castRay = function(player, x, y){
	const ray = this.getRay(player, x, y);
	return cast(player, ray, this.map.size*2, this.map);
};

Camera.prototype.resize = function(w,h){
	const { res, depth } = this.locs;
	this.canvas.width = w;
	this.canvas.height = h;
	this.gl.viewport(0, 0, w, h);
	this.gl.uniform2f(res, w, h);
	this.gl.uniform1f(depth, w/(2*Math.tan(this.fov/2)));
};

Camera.prototype.setCell = function(x,y,z,w,val){
	const gl = this.gl;
	this.mapdata[this.map.cellIndex(x,y,z,w)] = val;
	gl.activeTexture(gl.TEXTURE0);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.mapdata.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);
};

Camera.prototype.render = function(player){
	const gl = this.gl;
	const { origin, rgt, up, fwd } = this.locs;
	gl.uniform4f(origin, player.x, player.y, player.z, player.w);
	gl.uniform4f(rgt, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
	gl.uniform4f(up, player.up.x, player.up.y, player.up.z, player.up.w);
	gl.uniform4f(fwd, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

module.exports = Camera;