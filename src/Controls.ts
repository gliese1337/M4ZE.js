import { ControlUpdater, KeyValues, MousePos } from './Game';

interface MazeKeyValues {
  m: boolean;
  spc: boolean;
  sft: boolean;
  min: boolean;
  pls: boolean;
  lft: boolean;
  rgt: boolean;
  rlt: boolean;
  rrt: boolean;
  up: boolean;
  dwn: boolean;
  wlt: boolean;
  wrt: boolean;
  wrl: boolean;
  wrr: boolean;
  wup: boolean;
  wdn: boolean;
  x: boolean;
  y: boolean;
  z: boolean;
  lmb: boolean;
  rmb: boolean;
};

export interface ControlStates {
  mark: boolean;
  fwd: boolean;
  bak: boolean;
  pup: boolean;
  pdn: boolean,
  ylt: boolean;
  yrt: boolean;
  rlt: boolean;
  rrt: boolean;
  wup: boolean;
  wdn: boolean,
  wyl: boolean;
  wyr: boolean;
  wrl: boolean;
  wrr: boolean;
  zoomin: boolean;
  zoomout: boolean,
  mouse: boolean;
  mouseX: number;
  mouseY: number;
}

export const keyCodes: { [key: number]: keyof MazeKeyValues } = {
  // m for marking
  77: 'm',
  // space, shift, & alt
  32: 'spc', 16: 'sft',
  // plus & minus
  109: 'min', 107: 'pls',
  189: 'min', 187: 'pls',
  
  /* 3D controls */

  // left & right arrow, j & l, 4 & 6
  37: 'lft', 39: 'rgt',
  74: 'lft', 76: 'rgt',
  100: 'lft', 102: 'rgt',
  
  // u & o, 7 & 9
  36: 'rlt', 33: 'rrt',
  85: 'rlt', 79: 'rrt',
  103: 'rlt', 105: 'rrt',

  // up & down arrow, i & k, 8 & 5
  38: 'up', 40: 'dwn',
  73: 'up', 75: 'dwn',
  104: 'up', 101: 'dwn',

  /* 4D controls */
  // a & d
  65: 'wlt', 68: 'wrt',
  // q & e
  81: 'wrl', 69: 'wrr',
  // w & s 
  87: 'wup', 83: 'wdn',
  
  // z x c & , . /
  44: 'z', 46: 'x', 47: 'y',
  90: 'z', 88: 'x', 67: 'y',
  188: 'z', 190: 'x', 191: 'y',
};

export const mouseCodes: { [key: number]: keyof MazeKeyValues } = {
  0: 'lmb',
  2: 'rmb',
};

export const defaultControlStates: ControlStates = {
  mark: false,
  fwd: false, bak: false,
  pup: false, pdn: false,
  ylt: false, yrt: false,
  rlt: false, rrt: false,
  wup: false, wdn: false,
  wyl: false, wyr: false,
  wrl: false, wrr: false,
  zoomin: false, zoomout: false,
  mouse: false, mouseX: 0, mouseY: 0
};

export const UpdateControls: (states: ControlStates) => ControlUpdater =
  (states: ControlStates) => (keys: KeyValues, mouse: MousePos) => {

      states.mouse = keys.rmb || keys.lmb;
      states.mouseX = -mouse.mouseX;
      states.mouseY = -mouse.mouseY;

      if (states.mouse) {
        states.fwd = keys.lmb && !keys.sft;
        states.bak = keys.lmb && keys.sft;
      } else {
        states.fwd = keys.spc && !keys.sft;
        states.bak = keys.spc && keys.sft;
      }
  
      states.mark = keys.m;
      states.zoomin = !keys.pls && keys.min;
      states.zoomout = keys.pls && !keys.min;

      // 3D Rotation
      states.pup = keys.up && !keys.dwn;
      states.pdn = !keys.up && keys.dwn;
      states.ylt = keys.lft && !keys.rgt;
      states.yrt = !keys.lft && keys.rgt;
      states.rlt = keys.rlt && !keys.rrt;
      states.rrt = !keys.rlt && keys.rrt;

      // 4D Rotation
      states.wup = keys.wup && !keys.wdn;
      states.wdn = !keys.wup && keys.wdn;
      states.wyl = keys.wlt && !keys.wrt;
      states.wyr = !keys.wlt && keys.wrt;
      states.wrl = keys.wrl && !keys.wrr;
      states.wrr = !keys.wrl && keys.wrr;
    };
