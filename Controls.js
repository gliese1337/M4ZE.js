class Controls {
	constructor(width, height) {
		"use strict";
		this.codes = {
			// m for marking
			77: 'm',
			// space, shift, & alt
			32: 'spc', 16: 'sft',
			// plus & minus
			109: 'min', 107: 'pls',
			189: 'min', 187: 'pls',
			// left & right arrow, a & d, j & l, 4 & 6
			37: 'lft', 39: 'rgt',
			65: 'lft', 68: 'rgt',
			74: 'lft', 76: 'rgt',
			100: 'lft', 102: 'rgt',
			// q & e, u & o, 7 & 9
			81: 'rlt', 69: 'rrt',
			36: 'rlt', 33: 'rrt',
			85: 'rlt', 79: 'rrt',
			103: 'rlt', 105: 'rrt',
			// up & down arrow, w & s, i & k, 8 & 5
			38: 'up', 40: 'dwn',
			87: 'up', 83: 'dwn',
			73: 'up', 75: 'dwn',
			104: 'up', 101: 'dwn',
			12: 'dwn',
			// z x c & , . /
			44: 'z', 46: 'x', 47: 'y',
			90: 'z', 88: 'x', 67: 'y',
			188: 'z', 190: 'x', 191: 'y'
		};
		this.keys = {
			m: 0,
			spc: 0, sft: 0,
			min: 0, pls: 0,
			lft: 0, rgt: 0,
			rlt: 0, rrt: 0,
			up: 0, dwn: 0,
			x: 0, y: 0, z: 0,
			lmb: 0, rmb: 0
		};
		this.states = {
			mark: false, unmk: false,
			fwd: false, bak: false,
			pup: false, pdn: false, vp: 'z', kp: 'y',
			ylt: false, yrt: false, vy: 'z', ky: 'x',
			rlt: false, rrt: false, vr: 'x', kr: 'y',
			zoomin: false, zoomout: false,
			mouse: false, mouseX: 0, mouseY: 0,
			clipX: 0, clipY: 0
		};
		Object.defineProperties(this, {
			width: {
				get: () => width,
				set: (w) => {
					this.states.mouseX + (width - w) / 2;
					width = w;
				}
			},
			height: {
				get: () => height,
				set: (h) => {
					this.states.mouseY + (height - h) / 2;
					height = h;
				}
			}
		});
		document.addEventListener('keydown', this.onKey.bind(this, 1), false);
		document.addEventListener('keyup', this.onKey.bind(this, 0), false);
		document.addEventListener('mousedown', this.onMouse.bind(this, 1), false);
		document.addEventListener('mousemove', this.onMouse.bind(this, 0), false);
		document.addEventListener('mouseup', this.onMouse.bind(this, -1), false);
	}
	onMouse(val, e) {
		const button = e.button;
		if (button !== 0 && button !== 2) {
			return;
		}
		const { width, height, states, keys } = this;
		if (val === 1) {
			if (button === 2) {
				keys.rmb = 1;
			}
			else {
				keys.lmb = 1;
				states.fwd = !keys.sft;
				states.bak = false;
			}
			states.mouseX = e.pageX - width / 2;
			states.mouseY = e.pageY - height / 2;
			states.clipX = 2 * (states.mouseX / width);
			states.clipY = 2 * (states.mouseY / height);
			states.mouse = true;
			document.body.style.cursor = "none";
		}
		else if (val === -1) {
			if (button === 2) {
				keys.rmb = 0;
			}
			else {
				keys.lmb = 0;
				states.fwd = !!this.keys.spc && !keys.sft;
				states.bak = !!this.keys.spc && keys.sft;
			}
			states.mouse = keys.lmb || keys.rmb;
			document.body.style.cursor = "default";
		}
		else if (states.mouse) {
			states.mouseX = e.pageX - width / 2;
			states.mouseY = e.pageY - height / 2;
			states.clipX = 2 * (states.mouseX / width);
			states.clipY = 2 * (states.mouseY / height);
		}
	}
	onKey(val, e) {
		"use strict";
		const key = this.codes[e.keyCode];
		if (typeof key === 'undefined') {
			return;
		}
		e.preventDefault && e.preventDefault();
		e.stopPropagation && e.stopPropagation();
		const states = this.states;
		const keys = this.keys;
		keys[key] = val;
		states.mark = !!keys.m;
		states.zoomin = !keys.pls && keys.min;
		states.zoomout = keys.pls && !keys.min;
		if (keys.sft) {
			states.fwd = false;
			states.bak = !!keys.spc && !keys.lmb;
		}
		else if (!keys.sft) {
			states.fwd = !!keys.spc || keys.lmb;
			states.bak = false;
		}
		// Rotation
		states.pup = keys.up && !keys.dwn;
		states.pdn = !keys.up && keys.dwn;
		states.ylt = keys.lft && !keys.rgt;
		states.yrt = !keys.lft && keys.rgt;
		states.rlt = keys.rlt && !keys.rrt;
		states.rrt = !keys.rlt && keys.rrt;
		// Default pitch, yaw, and roll planes
		states.vp = 'z';
		states.kp = 'y';
		states.vy = 'z';
		states.ky = 'x';
		states.vr = 'y';
		states.kr = 'x';
		if (keys.x + keys.y + keys.z === 1) {
			if (keys.x) {
				states.vp = 'x';
				states.kp = 'w';
				states.vy = 'y';
				states.ky = 'w';
				states.vr = 'z';
				states.kr = 'w';
			}
			else if (keys.y) {
				states.vp = 'y';
				states.kp = 'w';
				states.vy = 'z';
				states.ky = 'w';
				states.vr = 'x';
				states.kr = 'w';
			}
			else {
				states.vp = 'z';
				states.kp = 'w';
				states.vy = 'x';
				states.ky = 'w';
				states.vr = 'y';
				states.kr = 'w';
			}
		}
	}
}

module.exports = Controls;