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

  private keys: KeyValues = {
    m: false,
    spc: false, sft: false,
    min: false, pls: false,
    lft: false, rgt: false,
    rlt: false, rrt: false,
    up: false, dwn: false,
    wlt: false, wrt: false,
    wrl: false, wrr: false,
    wup: false, wdn: false,
    x: false, y: false, z: false,
    lmb: false, rmb: false,
  };

  public states: ControlStates = {
    mark: false,
    fwd: false, bak: false,
    pup: false, pdn: false,
    ylt: false, yrt: false,
    rlt: false, rrt: false,
    wup: false, wdn: false,
    wyl: false, wyr: false,
    wrl: false, wrr: false,
    zoomin: false, zoomout: false,
    mouse: false, mouseX: 0, mouseY: 0,
    clipX: 0, clipY: 0
  };

  public activated = false;

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
    const { button } = e;
    
    const { width, height, states, keys } = this;
    
    states.mouseX = e.pageX - width / 2;
    states.mouseY = e.pageY - height / 2;
    states.clipX = 2 * (states.mouseX / width);
    states.clipY = 2 * (states.mouseY / height);

    if (button !== 0 && button !== 2) {
      return;
    }

    if (val === 1) {
      if (button === 2) {
        keys.rmb = true;
      } else {
        keys.lmb = true;
        states.fwd = !keys.sft;
        states.bak = keys.sft;
      }
      states.mouse = true;
      this.activated = true;
    } else if (val === -1) {
      if (button === 2) {
        keys.rmb = false;
      } else {
        keys.lmb = false;
        states.fwd = this.keys.spc && !keys.sft;
        states.bak = this.keys.spc && keys.sft;
      }
      states.mouse = keys.lmb || keys.rmb;
    }
  }

  onKey(val: boolean, e: KeyboardEvent) {
    const key = this.codes[e.keyCode];
    if (typeof key === 'undefined') {
      return;
    }
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();

    const keys = this.keys;
    if (keys[key] === val) return;
    keys[key] = val;

    if (!this.activated && val) {
      this.activated = true;
    }

    const states = this.states;
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
  }
}
