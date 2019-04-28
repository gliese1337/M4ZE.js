import createProgramFromScripts from "./webgl-utils";
import Maze from "./Maze";
import Player from "./Player";
import cast from "./Raycast";

interface LocMap {
	size: WebGLUniformLocation | null;
	map: WebGLUniformLocation | null;
	color: WebGLUniformLocation | null;
	res: WebGLUniformLocation | null;
	depth: WebGLUniformLocation | null;
	origin: WebGLUniformLocation | null;
	rgt: WebGLUniformLocation | null;
	up: WebGLUniformLocation | null;
	fwd: WebGLUniformLocation | null;
	seed: WebGLUniformLocation | null;
}

async function initCamera(gl: WebGL2RenderingContext, width: number, height: number) {

	// Create and bind the framebuffer
	//gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());
	//attachTexture(gl, width, height, gl.COLOR_ATTACHMENT0); // rendering texture

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

export default class Camera {
	private gl: WebGL2RenderingContext;
	private mapdata: Uint8Array;
	private mapsize: number;
	private planesize: number;
	private _depth: number;
	private locs: LocMap;
	public onready: (onfulfilled: () => void) => Promise<void>;

	constructor(private canvas: HTMLCanvasElement, public readonly map: Maze, private hfov: number) {
		const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
		this.gl = gl;
		this.mapdata = map.flatten();
		this.mapsize = map.size;
		this.planesize = map.size * map.size;
		this.locs = {} as LocMap;
	
		this._depth = canvas.width / (2 * Math.tan(hfov / 2));

		const promise = initCamera(gl, canvas.width, canvas.height)
			.then((locs: LocMap) => {
				this.locs = locs;
				gl.uniform1f(locs.depth, canvas.width / (2 * Math.tan(hfov / 2)));
				gl.uniform1i(locs.size, this.mapsize);
				gl.activeTexture(gl.TEXTURE0);
				gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.planesize, this.planesize, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);
			});
		
		this.onready = promise.then.bind(promise);
	}
	
	get fov() { return this.hfov; }
	set fov (a) {
		this.hfov = a;
		this._depth = this.canvas.width / (2 * Math.tan(a / 2));
		this.gl.uniform1f(this.locs.depth, this._depth);
	}

	get depth() { return this._depth }
	set depth(d) {
		this._depth = d;
		this.hfov = 2 * Math.atan(this.canvas.width / (2 * d));
		this.gl.uniform1f(this.locs.depth, d);
	}

	get width() { return this.canvas.width; }
	get height() { return this.canvas.height; }

	getDepth(player: Player, x: number, y: number) {
		const depth = this._depth;
		const { fwd, rgt, up } = player;
		const ray = {
			x: fwd.x * depth + rgt.x * x + up.x * y,
			y: fwd.y * depth + rgt.y * x + up.y * y,
			z: fwd.z * depth + rgt.z * x + up.z * y,
			w: fwd.w * depth + rgt.w * x + up.z * y
		};

		return cast(player, ray, this.mapsize * 2, this.map);
	}
	resize(w: number, h: number) {
		const { gl, canvas, fov, locs: { res, depth } } = this;
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, w, h);
		gl.uniform2f(res, w, h);
		gl.uniform1f(depth, w / (2 * Math.tan(fov / 2)));
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
	setCell(x: number, y: number, z: number, w: number, val: number, defer = false) {
		this.mapdata[this.map.cellIndex(x, y, z, w)] = val;
		if (!defer)	this.loadMap();
	}
	loadMap() {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.planesize, this.planesize, 0, gl.RED, gl.UNSIGNED_BYTE, this.mapdata);
	}
	render(player: Player) {
		const gl = this.gl;
		const { origin, rgt, up, fwd } = this.locs;
		gl.uniform4f(origin, player.x, player.y, player.z, player.w);
		gl.uniform4f(rgt, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
		gl.uniform4f(up, player.up.x, player.up.y, player.up.z, player.up.w);
		gl.uniform4f(fwd, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
}
