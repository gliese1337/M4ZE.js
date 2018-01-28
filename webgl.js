const SIZE = 5;
const Camera = require("./GLCamera.js");
const Overlay = require("./Overlay.js");
const Player = require("./Player.js");
const Controls = require("./Controls.js");
const GameLoop = require("./GameLoop.js");
const Maze = require("./Maze.js");
const GL_Utils = require("./webgl-utils.js");

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
	if(camera){
		camera.setCell(start.x,start.y,start.z,start.w,0);
		camera.setCell(end.x,end.y,end.z,end.w,2);
	}
	path.forEach(({x,y,z,w},i) => {
		if((i+1) % mod == 0){
			map.set(x,y,z,w,1);
			if(camera){ camera.setCell(x,y,z,w,1); }
		}else{
			map.set(x,y,z,w,4);
			if(camera){ camera.setCell(x,y,z,w,0); }
		}
	});
}

function reset(camera, overlay, player){
	const map = new Maze(SIZE);
	const route = get_route(map);
	const { start: {x, y, z, w}, path } = route;

	mark_route(map, route);

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

function main(d, o){
	"use strict";

	let map = new Maze(SIZE);
	let route = get_route(map);
	mark_route(null, map, route, 0);

	let rounds = 0;

	let {start: {x, y, z, w}, path} = route;
	const player = new Player(x+.5, y+.5, z+.5, w+.5);
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

	let covered = 0;
	let states = controls.states;

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

	const update_cell = () => {
		const cx = Math.floor(player.x);
		const cy = Math.floor(player.y);
		const cz = Math.floor(player.z);
		const cw = Math.floor(player.w);

		const val = map.get(cx,cy,cz,cw);
		if(cx !== x || cy !== y || cz !== z || cw !== w){
			//Enter cell
			[x,y,z,w] = [cx,cy,cz,cw];
			if(val === 2){
				if(rounds < path.length){
					console.log("finished");
					reverse(camera, map, route, ++rounds, overlay);
				}else{
					rounds = 0;
					({map, route} = reset(camera, overlay, player));
				}
				return true;
			}else if(val === 1 || val == 4){
				let nv = states.mark?3:0;
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

		const { dist } = camera.castRay(player);
		overlay.tick(player, covered, seconds);
		overlay.reticle({ x: rx, y: ry, dist });
	};

	const loop = new GameLoop(seconds => {
		let change = player.update(states, map, seconds);
		change = update_zoom(seconds) || change;
		change = update_cell() || change;

		if(change){ camera.render(player); }
		update_overlay(seconds);
	});

	camera.onready(() => {
		camera.render(player);
		loop.start();
	});
}