const SIZE = 3;
const Camera = require("./GLCamera.js");
const Overlay = require("./Overlay.js");
const Player = require("./Player.js");
const Controls = require("./Controls.js");
const GameLoop = require("./GameLoop.js");
const Maze = require("./Maze.js");
const { vec_rot, normalize, orthogonalize, angle_between } = require('./Vectors.js');

function get_route(map){
	const path = map.getLongestPath();
	const start = path.shift();
	const end = path.pop();

	return { start, path, end };
}

function mark_route(camera, map, route, skip){
	const {start, path, end} = route;
	const mod = skip + 1;

	map.set(start.x,start.y,start.z,start.w,0);
	map.set(end.x,end.y,end.z,end.w,2);
	path.forEach(({x,y,z,w},i) => {
		if((i+1) % mod == 0){
			map.set(x,y,z,w,1);
			if(camera){ camera.setCell(x,y,z,w,1, true); }
		}else{
			map.set(x,y,z,w,4);
			if(camera){ camera.setCell(x,y,z,w,0, true); }
		}
	});
	if(camera){
		camera.setCell(start.x,start.y,start.z,start.w,0, true);
		camera.setCell(end.x,end.y,end.z,end.w,2, true);
		camera.loadMap();
	}
}

function reset(camera, overlay, player){
	const map = new Maze(SIZE);
	const route = get_route(map);
	const { start: {x, y, z, w}, path } = route;

	mark_route(camera, map, route, 0);

	camera.map = map;
	overlay.len = path.length+1;
	overlay.progress = 0;

	player.x += x - Math.floor(player.x);
	player.y += y - Math.floor(player.y);
	player.z += z - Math.floor(player.z);
	player.w += w - Math.floor(player.w);

	return { map, route };
}

function reverse(camera, map, route, skip, overlay){
	[route.end, route.start] = [route.start, route.end];
	route.path.reverse();

	mark_route(camera, map, route, skip);
	overlay.progress = 0;
}

function getStartAnaAxis(x, y, z, w, map) {
	if(map.get((x+1)%map.size, y, z, w) === 1 || map.get((x+1+map.size)%map.size, y, z, w) === 1) return 'x';
	if(map.get(x, (y+1)%map.size, z, w) === 1 || map.get(x, (y-1+map.size)%map.size, z, w) === 1) return 'y';
	if(map.get(x, y, (z+1)%map.size, w) === 1 || map.get(x, y, (z-1+map.size)%map.size, w) === 1) return 'z';
	return 'w';
}

function getDirectionToPath(pos, cell) {
	const diffdim = (d) =>
		Math.abs(cell[d] - Math.floor(pos[d])) > 1 ?
		pos[d] - cell[d] - 0.5 : cell[d] - pos[d] + 0.5;

	return normalize({
		x: diffdim('x'),
		y: diffdim('y'),
		z: diffdim('z'),
		w: diffdim('w'),
	});
}

function main(d, o){
	"use strict";

	const map = new Maze(SIZE);
	const route = get_route(map);
	mark_route(null, map, route, 0);

	let rounds = 0;

	let {start: {x, y, z, w}, path} = route;
	const ana = getStartAnaAxis(x, y, z, w, map);
	const player = new Player({
		x: x+Math.random(),
		y: y+Math.random(),
		z: z+Math.random(),
		w: w+Math.random(),
	}, ana);

	const controls = new Controls(d.width, d.height);
	const camera = new Camera(d, map, Math.PI / 1.5);
	const overlay = new Overlay(o, path.length+1);

	window.addEventListener('resize',() => {
		const w = window.innerWidth;
		const h = window.innerHeight;
		overlay.resize(w,h);
		camera.resize(w,h);
		controls.width = w;
		controls.height = h;
	},false);

	const states = controls.states;

	const update_zoom = seconds => {
		if(states.zoomin && camera.fov < Math.PI){
			camera.fov = Math.min(camera.fov + Math.PI*seconds/2, Math.PI);
			return true;
		}
		if(states.zoomout && camera.fov > .01){
			camera.fov = Math.max(camera.fov - Math.PI*seconds/2, 0);
			return true;
		}
		return false;
	};

	
	let player_control = false;

	const update_cell = () => {
		const cx = ((Math.floor(player.x)%map.size)+map.size)%map.size;
		const cy = ((Math.floor(player.y)%map.size)+map.size)%map.size;
		const cz = ((Math.floor(player.z)%map.size)+map.size)%map.size;
		const cw = ((Math.floor(player.w)%map.size)+map.size)%map.size;

		const val = map.get(cx,cy,cz,cw);
		if(cx !== x || cy !== y || cz !== z || cw !== w){
			//Enter cell
			[x,y,z,w] = [cx,cy,cz,cw];
			if(val === 2){
				if(rounds < path.length){
					reverse(camera, map, route, ++rounds, overlay);
					player_control = false;
				}else{
					rounds = 0;
					({map, route} = reset(camera, overlay, player));
					player_control = false;
				}
				return true;
			}else if(val === 1 || val == 4){
				const nv = states.mark?3:0;
				map.set(x,y,z,w,nv);
				camera.setCell(x,y,z,w,nv);
				overlay.progress++;
				return true;
			}else if(!states.mark && val === 3){
				map.set(x,y,z,w,0);
				camera.setCell(x,y,z,w,0);
				return true;
			}
		}else if(states.mark && val !== 3){
			map.set(x,y,z,w,3);
			camera.setCell(x,y,z,w,3);
			return true;
		}
		return false;
	};

	let rx = 0, ry = 0;
	const update_overlay = (seconds) => {
		if(states.mouse){
			({mouseX: rx, mouseY: ry} = states);
		}else{
			if(rx !== 0){ rx /= 1.5;}
			if(Math.abs(rx) < .01){ rx = 0; }
			if(ry !== 0){ ry /= 1.5;}
			if(Math.abs(ry) < .01){ ry = 0; }
		}

		const dist = camera.getDepth(Math.round(rx + camera.canvas.width / 2), Math.round(ry + camera.canvas.height / 2));
		overlay.tick(player, seconds);
		overlay.reticle({ x: rx, y: ry, dist });
	};

	const loop = new GameLoop((seconds) => {
		if(player_control){
			const maxdist = camera.getDepth(Math.floor(camera.canvas.width / 2), Math.floor(camera.canvas.height / 2));
			let change = player.update(states, seconds, maxdist);
			change = update_zoom(seconds) || change;
			change = update_cell() || change;

			if(change){ camera.render(player); }
			update_overlay(seconds);
		}else{
			let change = false;
			const fwd = getDirectionToPath(player, route.path[1]);
			const angle = Math.abs(angle_between(fwd, player.fwd));
			if(angle > 1e-5){
				const k = normalize(orthogonalize(fwd, player.fwd));
				const t =  angle > 0.0125 ? seconds * 0.5 : angle;
				player.fwd = vec_rot(player.fwd, k, t);
				player.rotate('x', 'y', t);
				player.renormalize();
				change = true;
			}

			const update_pos = (d) => {
				const dd = 0.5 - (player[d] % 1);
				if(Math.abs(dd) > 0.01){
					player[d] += seconds * dd;
					change = true;
				}
			};

			update_pos('x');
			update_pos('y');
			update_pos('z');
			update_pos('w');

			if(!change){
				console.log("Transferring control to the player");
				player_control = true;
			}

			camera.render(player);
			update_overlay(seconds);
		}
	});

	camera.onready(() => {
		camera.render(player);
		loop.start();
	});
}