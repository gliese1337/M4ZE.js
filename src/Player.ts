import { Vec4, vec_rot, normalize, orthogonalize } from "./Vectors";
import { ControlStates } from "./Controls";
import Maze from "./Maze";
import cast from "./Raycast";

const planes = {x:'rgt',y:'up',z:'fwd',w:'ana'};
const planeIndices = {x:0,y:1,z:2,w:3};
const basis = [
	{ x: 1, y: 0, z: 0, w: 0 },
	{ x: 0, y: 1, z: 0, w: 0 },
	{ x: 0, y: 0, z: 1, w: 0 },
	{ x: 0, y: 0, z: 0, w: 1 },
];

const turnRate = Math.PI / 2.5;

function rotArray(arr: Vec4[], count: number) {
	arr = arr.slice();
	count -= arr.length * Math.floor(count / arr.length);
	arr.push(...arr.splice(0, count));
	return arr;
  }

export default class Player implements Vec4 {
	private speed = 0;

	public x: number;
	public y: number;
	public z: number;
	public w: number;

	public fwd: Vec4;
	public rgt: Vec4;
	public up: Vec4;
	public ana: Vec4;

	constructor({x, y, z, w}: Vec4, ana: keyof Vec4) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		[
			this.rgt,
			this.up,
			this.fwd,
			this.ana,
		] = rotArray(basis, (planeIndices[ana] + 1) % 4);
	}
	rotate(v: keyof Vec4, k: keyof Vec4, angle: number) {
		const vn = planes[v] as "rgt"|"fwd"|"up"|"ana";
		const kn = planes[k] as "rgt"|"fwd"|"up"|"ana";;
		this[vn] = vec_rot(this[vn], this[kn], angle);
		this[kn] = vec_rot(this[kn], this[vn], -angle);
	}
	renormalize() {
		let { rgt, up, fwd, ana } = this;
		fwd = normalize(fwd);
		this.fwd = fwd;
		rgt = normalize(orthogonalize(rgt, fwd));
		this.rgt = rgt;
		up = normalize(orthogonalize(orthogonalize(up, fwd), rgt));
		this.up = up;
		ana = normalize(orthogonalize(orthogonalize(orthogonalize(ana, fwd), rgt), up));
		this.ana = ana;
	}
	translate(seconds: number, map: Maze) {
		const fwd = this.fwd;
		const inc = this.speed * seconds;
		let dx = fwd.x * inc;
		let dy = fwd.y * inc;
		let dz = fwd.z * inc;
		let dw = fwd.w * inc;

		const ray = this.speed > 0 ? fwd : {
			x: -fwd.x, y: -fwd.y,
			z: -fwd.z, w: -fwd.w,
		};
		const dist = cast(this, ray, map.size * 2, map);
		const xmax = Math.max(Math.abs(fwd.x * dist) - .001, 0);
		const ymax = Math.max(Math.abs(fwd.y * dist) - .001, 0);
		const zmax = Math.max(Math.abs(fwd.z * dist) - .001, 0);
		const wmax = Math.max(Math.abs(fwd.w * dist) - .001, 0);
		if (Math.abs(dx) > xmax) {
			dx = Math.sign(dx) * xmax;
		}
		if (Math.abs(dy) > ymax) {
			dy = Math.sign(dy) * ymax;
		}
		if (Math.abs(dz) > zmax) {
			dz = Math.sign(dz) * zmax;
		}
		if (Math.abs(dw) > wmax) {
			dw = Math.sign(dw) * wmax;
		}

		this.x = this.x + dx;
		this.y = this.y + dy;
		this.z = this.z + dz;
		this.w = this.w + dw;
	}
	update_speed(controls: ControlStates, seconds: number) {
		const maxs = controls.mouse ? 0.5 : 1;
		if (controls.fwd) {
			this.speed += 0.75 * seconds;
			if (this.speed > maxs) {
				this.speed = maxs;
			}
		}
		else if (controls.bak) {
			this.speed -= 0.75 * seconds;
			if (this.speed < -maxs) {
				this.speed = -maxs;
			}
		}
		else {
			this.speed /= Math.pow(75, seconds);
			if (Math.abs(this.speed) < .01) {
				this.speed = 0;
			}
		}
	}
	update(controls: ControlStates, seconds: number, map: Maze) {
		let moved = false;
		if (controls.pup) {
			this.rotate(controls.vp, controls.kp, seconds * turnRate);
			moved = true;
		}
		else if (controls.pdn) {
			this.rotate(controls.kp, controls.vp, seconds * turnRate);
			moved = true;
		}
		if (controls.yrt) {
			this.rotate(controls.vy, controls.ky, seconds * turnRate);
			moved = true;
		}
		else if (controls.ylt) {
			this.rotate(controls.ky, controls.vy, seconds * turnRate);
			moved = true;
		}
		if (controls.rrt) {
			this.rotate(controls.vr, controls.kr, seconds * turnRate);
			moved = true;
		}
		else if (controls.rlt) {
			this.rotate(controls.kr, controls.vr, seconds * turnRate);
			moved = true;
		}
		if (controls.mouse) {
			const { clipX: x, clipY: y } = controls;
			moved = true;
			if (x !== 0) {
				this.rotate(controls.vy, controls.ky, seconds * x * turnRate);
			}
			if (y !== 0) {
				this.rotate(controls.kp, controls.vp, seconds * y * turnRate);
			}
		}
		if (moved) {
			this.renormalize();
		}
		this.update_speed(controls, seconds);
		if (this.speed !== 0) {
			this.translate(seconds, map);
			moved = true;
		}
		return moved;
	}
}
