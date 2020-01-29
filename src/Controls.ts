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

type sign = -1|0|1;

export interface ControlStates {
  mark: boolean;
  fwdbak: sign;
  pitc: sign;
  zyaw: sign;
  roll: sign;
  wptc: sign;
  wyaw: sign;
  wrol: sign;
  zoom: sign;
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
  fwdbak: 0,
  pitc: 0, zyaw: 0, roll: 0,
  wptc: 0, wyaw: 0, wrol: 0,
  zoom: 0,
  mouse: false, mouseX: 0, mouseY: 0
};

export const UpdateControls: (states: ControlStates) => ControlUpdater =
  (states: ControlStates) => (keys: KeyValues, mouse: MousePos) => {

    states.mouse = keys.rmb || keys.lmb;
    states.mouseX = -mouse.mouseX;
    states.mouseY = -mouse.mouseY;

    if (states.mouse) {
      states.fwdbak = keys.lmb ? keys.sft ? -1 : 1 : 0;
    } else {
      states.fwdbak = keys.spc ? keys.sft ? -1 : 1 : 0;
    }

    states.mark = keys.m;
    states.zoom = (keys.pls ? 1 : 0) + (keys.min ? -1 : 0) as sign;

    // 3D Rotation
    states.pitc = (keys.up  ? 1 : 0) + (keys.dwn ? -1 : 0) as sign;
    states.zyaw = (keys.lft ? 1 : 0) + (keys.rgt ? -1 : 0) as sign;
    states.roll = (keys.rlt ? 1 : 0) + (keys.rrt ? -1 : 0) as sign;

    // 4D Rotation
    states.wptc = (keys.wup ? 1 : 0) + (keys.wdn ? -1 : 0) as sign;
    states.wyaw = (keys.wlt ? 1 : 0) + (keys.wrt ? -1 : 0) as sign;
    states.wrol = (keys.wrl ? 1 : 0) + (keys.wrr ? -1 : 0) as sign;
  };
