import Camera from "./GLCamera";
import Overlay from "./Overlay";
import Player from "./Player";
import Controls, { ControlStates } from "./Controls";
import GameLoop from "./GameLoop";
import Maze from "./Maze.js";
import { vec_rot, normalize, orthonorm, angle_between, Vec4 } from "./Vectors";

const SIZE = 3;

function mark_route(camera: Camera, map: Maze, skip: number) {
  const { start, path, end } = map.route;
  const mod = skip + 1;

  path.forEach((cell,i) => {
    const blue = (i+1) % mod === 0 ? 1 : 0;
    map.set(cell, blue);
    camera.setCell(cell, [blue, 255], true);
  });

  map.set(start, 0);
  map.set(end, 2);
  camera.setCell(start, [0, 255], true);
  camera.setCell(end, [2, 255], false);
}

function reverse(camera: Camera, map: Maze, skip: number, overlay: Overlay) {
  const { route } = map;
  [route.end, route.start] = [route.start, route.end];
  [route.fromEnd, route.fromStart] = [route.fromStart, route.fromEnd];
  route.path.reverse();
  mark_route(camera, map, skip);
  overlay.progress = route.fromEnd[map.getId(route.start)];
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

function update_zoom(camera: Camera, states: ControlStates, seconds: number) {
  if (states.zoomin && camera.fov < Math.PI) {
    camera.fov = Math.min(camera.fov + Math.PI*seconds/2, Math.PI);
    return true;
  }
  if (states.zoomout && camera.fov > .01) {
    camera.fov = Math.max(camera.fov - Math.PI*seconds/2, 0);
    return true;
  }
  return false;
}

let rx = 0, ry = 0;
function update_overlay(camera: Camera, overlay: Overlay, player: Player, states: ControlStates, seconds: number) {
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
}

export default function main(d: HTMLCanvasElement, o: HTMLCanvasElement) {
  const map = new Maze(SIZE);
  const route = map.route;

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
  const overlay = new Overlay(o);

  mark_route(camera, map, 0);

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    overlay.resize(w,h);
    camera.resize(w,h);
    controls.resize(w, h);
  },false);

  const states = controls.states;

  const update_cell = ({ x: cx, y: cy, z: cz, w: cw }: Vec4) => {
    cx = Math.floor(cx);
    cy = Math.floor(cy);
    cz = Math.floor(cz);
    cw = Math.floor(cw);

    if (cx !== curr_cell.x || cy !== curr_cell.y || cz !== curr_cell.z || cw !== curr_cell.w) {
      //Enter cell
      curr_cell.x = cx;
      curr_cell.y = cy;
      curr_cell.z = cz;
      curr_cell.w = cw;
      
      switch (map.get(curr_cell)) {
        case 2: {
          if (rounds < route.path.length) {
            reverse(camera, map, ++rounds, overlay);
            controls.activated = false;
          } else {
            throw new Error("Resetting is not yet implemented");
          }
          return true;
        }
        case 1: case 3: {
          const nv = states.mark?3:0;
          map.set(curr_cell, nv);
          camera.setCell(curr_cell, [nv]);

          // If we skip over a cell by jumping a corner,
          // make sure it gets uncolored as well.
          let idx = map.route.path.findIndex(
            ({ x, y, z, w }) => x === cx && y === cy && z === cz && w === cw
          ) - 1;
          for (; idx > -1; idx--) {
            const cell = map.route.path[idx];
            if (map.get(cell) === 0) break;
            map.set(curr_cell, 0);
            camera.setCell(curr_cell, [0]);
          }

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
  }

  const loop = new GameLoop((seconds: number) => {
    overlay.progress = route.fromEnd[map.getId(curr_cell)];
    if (controls.activated) {
      let change = player.update(states, seconds, map);
      change = update_zoom(camera, states, seconds) || change;
      change = update_cell(player.pos) || change;

      if (change) { camera.render(player); }

      overlay.progress = route.fromEnd[map.getId(curr_cell)];
    } else {
      let change = false;
      const { pos, fwd } = player;
      const k = getDirectionToPath(pos, route.path[0]);
      const angle = Math.abs(angle_between(k, fwd));
      if (angle > 1e-5) {
        orthonorm(k, [fwd]);
        const t =  angle > 0.0125 ? seconds * 0.5 : angle;
        vec_rot(fwd, k, t);
        player.rotate('x', 'y', t / 1.5, false);
        player.renormalize();
        change = true;
      }

      for (const d of [ "x", "y", "z", "w" ] as (keyof Vec4)[]) {
        const dd = 0.5 - (pos[d] - Math.floor(pos[d]));
        if (Math.abs(dd) > 0.01) {
          pos[d] += seconds * dd;
        }
      }

      if (!change) {
        console.log("Transferring control to the player");
        player.velocity = { x: 0, y: 0, z: 0, w: 0 };
        controls.activated = true;
      }

      camera.render(player);
    }

    update_overlay(camera, overlay, player, states, seconds);

    //console.log("Current Cell:", curr_cell);
    //console.log("Player pos:", player.pos);
    //console.log("Cell value:", map.get(curr_cell));
  });

  camera.onready(() => {
    console.log("Current Cell:", curr_cell);
    console.log("Player pos:", player.pos);
    console.log("Cell value:", map.get(curr_cell));
    camera.render(player);
    loop.start();
  });
}