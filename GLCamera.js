const createProgramFromScripts = require("./webgl-utils.js");

function attachTexture(gl, width, height, attachmentPoint) {
	const targetTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, targetTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);
}

async function initCamera(gl, width, height) {

	// Create and bind the framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());

	attachTexture(gl, width, height, gl.COLOR_ATTACHMENT0); // rendering texture
	attachTexture(gl, width, height, gl.COLOR_ATTACHMENT1); // depth texture
	gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

	// Create a buffer and put a single rectangle in it
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1, 1, -1, -1, 1,
		1, -1, -1, 1, 1, 1,
	]), gl.STATIC_DRAW);

	// compile the shaders and link into a program
	const program = await createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);
	gl.useProgram(program);

	// look up where the vertex data needs to go.
	const posAttrLoc = gl.getAttribLocation(program, "a_position");
	// Turn on the attribute
	gl.enableVertexAttribArray(posAttrLoc);
	// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
	gl.vertexAttribPointer(posAttrLoc, 2, // size, 2 components per iteration
		gl.FLOAT, // type, 32bit floats
		false, // norm, don't normalize data
		0, // stride, don't skip anything
		0 // offset
	);

	// Tell WebGL how to convert from clip space to pixels
	gl.viewport(0, 0, width, height);

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

	// Set cross-frame constant uniforms
	gl.uniform2f(locs.res, width, height);
	gl.uniform3f(locs.seed, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
	gl.uniform1i(locs.map, 0);

	const tex = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	//load textures
	gl.uniform1i(locs.color, 1);
	await new Promise((resolve) => {
		const image = new Image();
		image.src = "colorscale.png";
		image.addEventListener("load", () => {
			const tex = gl.createTexture();
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			resolve();
		});
	});

	return locs;
}

class Camera {
	constructor(canvas, map, hfov) {
		const glCanvas = document.createElement('canvas');
		glCanvas.width = canvas.width;
		glCanvas.height = canvas.height;
		const gl = glCanvas.getContext("webgl2");
		this.gl = gl;
		this.ctx = canvas.getContext('2d');
		this.canvas = canvas;
		this.mapdata = map.flatten();
		this.mapsize = map.size;
		this.locs = {};
		this.depthmap = null;

		let depth = canvas.width / (2 * Math.tan(hfov / 2));
		Object.defineProperties(this, {
			map: {
				get: () => map,
			},
			fov: {
				get: () => hfov,
				set: function (a) {
					hfov = a;
					depth = canvas.width / (2 * Math.tan(hfov / 2));
					gl.uniform1f(this.locs.depth, depth);
				}
			},
			depth: {
				get: () => depth,
				set: function (d) {
					depth = d;
					hfov = 2 * Math.atan(canvas.width / (2 * d));
					gl.uniform1f(this.locs.depth, depth);
				}
			}
		});

		const promise = initCamera(gl, canvas.width, canvas.height)
			.then((locs) => {
				this.locs = locs;
				gl.activeTexture(gl.TEXTURE0);
				gl.uniform1f(locs.depth, canvas.width / (2 * Math.tan(hfov / 2)));
				gl.uniform1i(locs.size, this.mapsize);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.mapdata.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);
			});
		
		this.onready = promise.then.bind(promise);
	}
	getDepth(x, y) {
		return this.depthmap[4*(x + y*this.gl.drawingBufferWidth)] / 25.5;
	}
	resize(w, h) {
		const { gl, canvas, fov, locs: { res, depth } } = this;
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, w, h);
		gl.uniform2f(res, w, h);
		gl.uniform1f(depth, w / (2 * Math.tan(fov / 2)));
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
	setCell(x, y, z, w, val, defer = false) {
		this.mapdata[this.map.cellIndex(x, y, z, w)] = val;
		if (!defer)	this.loadMap();
	}
	loadMap() {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.mapdata.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);
	}
	render(player) {
		const gl = this.gl;
		const { origin, rgt, up, fwd } = this.locs;
		const SIZE = this.mapsize;
		gl.uniform4f(origin, player.x, player.y, player.z, player.w);
		gl.uniform4f(rgt, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
		gl.uniform4f(up, player.up.x, player.up.y, player.up.z, player.up.w);
		gl.uniform4f(fwd, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		const imgdata = this.ctx.createImageData(gl.drawingBufferWidth, gl.drawingBufferHeight);
		const pixels = new Uint8Array(imgdata.data.buffer);
		gl.readBuffer(gl.COLOR_ATTACHMENT0);
		gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		this.ctx.putImageData(imgdata, 0, 0, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

		const bits = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
		gl.readBuffer(gl.COLOR_ATTACHMENT1);
		gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bits);
		this.depthmap = bits;
	}
}

module.exports = Camera;