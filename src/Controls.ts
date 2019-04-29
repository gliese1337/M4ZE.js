import { Vec4 } from "./Vectors";

interface KeyValues {
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
  x: boolean;
  y: boolean;
  z: boolean;
  lmb: boolean;
  rmb: boolean;
};

export interface ControlStates {
  mark: boolean;
  unmk: boolean;
  fwd: boolean;
  bak: boolean;
  pup: boolean;
  pdn: boolean,
  ylt: boolean;
  yrt: boolean;
  rlt: boolean;
  rrt: boolean;
  vp: keyof Vec4;
  kp: keyof Vec4;
  vy: keyof Vec4;
  ky: keyof Vec4;
  vr: keyof Vec4;
  kr: keyof Vec4;
  zoomin: boolean;
  zoomout: boolean,
  mouse: boolean;
  mouseX: number;
  mouseY: number;
  clipX: number;
  clipY: number;
}

export default class Controls {
  private codes: { [key: number]: keyof KeyValues } = {
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
    188: 'z', 190: 'x', 191: 'y',
  };

  private keys: KeyValues = {
    m: false,
    spc: false, sft: false,
    min: false, pls: false,
    lft: false, rgt: false,
    rlt: false, rrt: false,
    up: false, dwn: false,
    x: false, y: false, z: false,
    lmb: false, rmb: false,
  };

  public states: ControlStates = {
    mark: false, unmk: false,
    fwd: false, bak: false,
    pup: false, pdn: false, vp: 'z', kp: 'y',
    ylt: false, yrt: false, vy: 'z', ky: 'x',
    rlt: false, rrt: false, vr: 'x', kr: 'y',
    zoomin: false, zoomout: false,
    mouse: false, mouseX: 0, mouseY: 0,
    clipX: 0, clipY: 0
  };

  constructor(private width: number, private height: number) {
    document.addEventListener('keydown', this.onKey.bind(this, true), false);
    document.addEventListener('keyup', this.onKey.bind(this, false), false);
    document.addEventListener('mousedown', this.onMouse.bind(this, 1), false);
    document.addEventListener('mousemove', this.onMouse.bind(this, 0), false);
    document.addEventListener('mouseup', this.onMouse.bind(this, -1), false);
  }
  resize(w: number, h: number) {
    this.states.mouseX + (this.width - w) / 2;
    this.states.mouseY + (this.height - h) / 2;
    this.width = w;
    this.height = h;
  }
  onMouse(val: -1|0|1, e: MouseEvent) {
    const button = e.button;
    if (button !== 0 && button !== 2) {
      return;
    }
    const { width, height, states, keys } = this;
    if (val === 1) {
      if (button === 2) {
        keys.rmb = true;
      } else {
        keys.lmb = true;
        states.fwd = !keys.sft;
        states.bak = false;
      }
      states.mouseX = e.pageX - width / 2;
      states.mouseY = e.pageY - height / 2;
      states.clipX = 2 * (states.mouseX / width);
      states.clipY = 2 * (states.mouseY / height);
      states.mouse = true;
      document.body.style.cursor = "none";
    } else if (val === -1) {
      if (button === 2) {
        keys.rmb = false;
      } else {
        keys.lmb = false;
        states.fwd = this.keys.spc && !keys.sft;
        states.bak = this.keys.spc && keys.sft;
      }
      states.mouse = keys.lmb || keys.rmb;
      document.body.style.cursor = "default";
    } else if (states.mouse) {
      states.mouseX = e.pageX - width / 2;
      states.mouseY = e.pageY - height / 2;
      states.clipX = 2 * (states.mouseX / width);
      states.clipY = 2 * (states.mouseY / height);
    }
  }
  onKey(val: boolean, e: KeyboardEvent) {
    const key = this.codes[e.keyCode];
    if (typeof key === 'undefined') {
      return;
    }
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    const states = this.states;
    const keys = this.keys;
    keys[key] = val;
    states.mark = keys.m;
    states.zoomin = !keys.pls && keys.min;
    states.zoomout = keys.pls && !keys.min;
    if (keys.sft) {
      states.fwd = false;
      states.bak = keys.spc && !keys.lmb;
    } else if (!keys.sft) {
      states.fwd = keys.spc || keys.lmb;
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
    if (keys.x && !(keys.y || keys.z)) {
      states.vp = 'x';
      states.kp = 'w';
      states.vy = 'y';
      states.ky = 'w';
      states.vr = 'z';
      states.kr = 'w';
    } else if (keys.y && !(keys.x || keys.z)) {
      states.vp = 'y';
      states.kp = 'w';
      states.vy = 'z';
      states.ky = 'w';
      states.vr = 'x';
      states.kr = 'w';
    } else if (keys.z && !(keys.x || keys.y)) {
      states.vp = 'z';
      states.kp = 'w';
      states.vy = 'x';
      states.ky = 'w';
      states.vr = 'y';
      states.kr = 'w';
    }
  }
}
