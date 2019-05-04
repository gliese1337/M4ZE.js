import Camera from "./GLCamera";
import Overlay from "./Overlay";
import Player from "./Player";
import Controls from "./Controls";
import GameLoop from "./GameLoop";
import Maze from "./Maze.js";
import { vec_rot, normalize, orthonorm, angle_between, Vec4 } from "./Vectors";

const SIZE = 4;

interface Route {
  start: Vec4;
  end: Vec4;
  path: Vec4[];
}

function get_route(map: Maze): Route {
  const path = map.getLongestPath();
  const start = path.shift() as Vec4;
  const end = path.pop() as Vec4;

  return { start, path, end };
}

function mark_route(camera: Camera, map: Maze, route: Route, skip: number) {
  const {start, path, end} = route;
  const mod = skip + 1;

  path.forEach((cell,i) => {
    const blue = (i+1) % mod === 0 ? 1 : 4;
    map.set(cell, blue);
    camera.setCell(cell, [blue, 191], true);
  });

  map.set(start, 0);
  map.set(end, 2);
  camera.setCell(start, [0, 255], true);
  camera.setCell(end, [2, 255], false);
}

function reverse(camera: Camera, map: Maze, route: any, skip: number, overlay: Overlay) {
  [route.end, route.start] = [route.start, route.end];
  route.path.reverse();

  mark_route(camera, map, route, skip);
  overlay.progress = 0;
}

function getStartAnaAxis({ x, y, z, w }: Vec4, map: Maze) {
  const { size } = map;
  if (map.get({ x: (x + 1) % size, y, z, w }) === 1 || map.get({ x: (x + 1 + size) % size, y, z, w }) === 1) return 'x';
  if (map.get({ x, y: (y + 1) % size, z, w }) === 1 || map.get({ x, y: (y - 1 + size) % size, z, w }) === 1) return 'y';
  if (map.get({ x, y, z: (z + 1) % size, w }) === 1 || map.get({ x, y, z: (z - 1 + size) % size, w }) === 1) return 'z';
  return 'w';
}

function getDirectionToPath(pos: Vec4, cell: Vec4) {
  const diffdim = (d: keyof Vec4) =>
    Math.abs(cell[d] - Math.floor(pos[d])) > 1 ?
    pos[d] - cell[d] - 0.5 : cell[d] - pos[d] + 0.5;

  const d = {
    x: diffdim('x'),
    y: diffdim('y'),
    z: diffdim('z'),
    w: diffdim('w'),
  };

  normalize(d);
  return d;
}

export default function main(d: HTMLCanvasElement, o: HTMLCanvasElement) {
  const map = new Maze(SIZE);
  const route = get_route(map);

  let rounds = 0;

  const curr_cell = { ...route.start };
  const ana = getStartAnaAxis(curr_cell, map);
  const player = new Player({
    x: curr_cell.x + 0.1 + 0.8 * Math.random(),
    y: curr_cell.y + 0.1 + 0.8 * Math.random(),
    z: curr_cell.z + 0.1 + 0.8 * Math.random(),
    w: curr_cell.w + 0.1 + 0.8 * Math.random(),
  }, ana);

  const controls = new Controls(d.width, d.height);
  const camera = new Camera(d, map, Math.PI / 1.5);
  const overlay = new Overlay(o, route.path.length+1);

  mark_route(camera, map, route, 0);

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    overlay.resize(w,h);
    camera.resize(w,h);
    controls.resize(w, h);
  },false);

  const states = controls.states;

  const update_zoom = (seconds: number) => {
    if (states.zoomin && camera.fov < Math.PI) {
      camera.fov = Math.min(camera.fov + Math.PI*seconds/2, Math.PI);
      return true;
    }
    if (states.zoomout && camera.fov > .01) {
      camera.fov = Math.max(camera.fov - Math.PI*seconds/2, 0);
      return true;
    }
    return false;
  };
  
  let player_control = false;

  const update_cell = ({ x: cx, y: cy, z: cz, w: cw }: Vec4) => {
    const { size } = map;
    cx = Math.floor(cx - size * Math.floor(cx / size));
    cy = Math.floor(cy - size * Math.floor(cy / size));
    cz = Math.floor(cz - size * Math.floor(cz / size));
    cw = Math.floor(cw - size * Math.floor(cw / size));

    if (cx !== curr_cell.x || cy !== curr_cell.y || cz !== curr_cell.z || cw !== curr_cell.w) {
      //Enter cell
      curr_cell.x = cx;
      curr_cell.y = cy;
      curr_cell.z = cz;
      curr_cell.w = cw;
      
      const val = map.get(curr_cell);

      switch (val) {
        case 2:
          if (rounds < route.path.length) {
            reverse(camera, map, route, ++rounds, overlay);
            player_control = false;
          } else {
            throw new Error("Resetting is not yet implemented");
          }
          return true;
        case 1: case 4: {
          const nv = states.mark?3:0;
          map.set(curr_cell, nv);
          camera.setCell(curr_cell, [nv]);
          overlay.progress++;
          return true;
        }
        case 3: if (!states.mark) {
          map.set(curr_cell, 0);
          camera.setCell(curr_cell, [0]);
          return true;
        }
      }
    } else {
      const val = map.get({ x: cx, y: cy, z: cz, w: cw });
      if (states.mark && val !== 3) {
        map.set(curr_cell, 3);
        camera.setCell(curr_cell, [3]);
        return true;
      }
    }
    return false;
  };

  let rx = 0, ry = 0;
  const update_overlay = (seconds: number) => {
    if (states.mouse) {
      ({mouseX: rx, mouseY: ry} = states);
    } else {
      if (rx !== 0) { rx /= 1.5;}
      if (Math.abs(rx) < .01) { rx = 0; }
      if (ry !== 0) { ry /= 1.5;}
      if (Math.abs(ry) < .01) { ry = 0; }
    }

    const { distance } = camera.getDepth(player, rx, ry);
    overlay.tick(seconds);
    overlay.reticle(rx, ry, distance);
  };

  const loop = new GameLoop((seconds: number) => {
    if (player_control) {
      let change = player.update(states, seconds, map);
      change = update_zoom(seconds) || change;
      change = update_cell(player) || change;

      if (change) { camera.render(player); }
      update_overlay(seconds);
    } else {
      let change = false;
      const k = getDirectionToPath(player, route.path[0]);
      const angle = Math.abs(angle_between(k, player.fwd));
      if (angle > 1e-5) {
        orthonorm(k, [player.fwd]);
        const t =  angle > 0.0125 ? seconds * 0.5 : angle;
        vec_rot(player.fwd, k, t);
        player.rotate('x', 'y', t/2, false);
        player.renormalize();
        change = true;
      }

      const update_pos = (d: keyof Vec4) => {
        const dd = 0.5 - (player[d] - Math.floor(player[d]));
        if (Math.abs(dd) > 0.01) {
          player[d] += seconds * dd;
        }
      };

      update_pos('x');
      update_pos('y');
      update_pos('z');
      update_pos('w');

      if (!change) {
		console.log("Transferring control to the player");
		player.velocity = { x: 0, y: 0, z: 0, w: 0 };
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