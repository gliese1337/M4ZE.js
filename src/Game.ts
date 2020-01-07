function GetMousePosition(e: any) {
  return e.type.startsWith('touch') ?
    [e.targetTouches[0].pageX, e.targetTouches[0].pageY] :
    [e.pageX, e.pageY];
}

interface InputCodes {
  [key: number]: string;
}

interface ReverseCodes {
  [key: string]: number[];
}

interface InputStates {
  [key: number]: boolean;
}

export interface KeyValues {
  [key: string]: boolean;
}

export interface MousePos {
  mouseX: number;
  mouseY: number;
};

export type ControlUpdater = (keys: KeyValues, mouse: MousePos) => void;

export default class Game {
  private _stop = false;
  private lastTime = 0;
  private frame: (seconds: number) => void;
  private body: (seconds: number) => void = () => {};
  private width = 0;
  private height = 0;

  // Input configuration
  private keyCodes: InputCodes = {};
  private mouseCodes: InputCodes = {};
  private keyStates: InputStates = {};
  private mouseStates: InputStates = {};
  private reverseKey: ReverseCodes = {};
  private reverseMouse: ReverseCodes = {};
  public keys: KeyValues = new Proxy({} as KeyValues, { get: (target, prop) => target[prop as string] || false });
  public mouse: MousePos = { mouseX: 0, mouseY: 0};
  private update: ControlUpdater = () => {};

  public controlsActive = false;
  public controlsTriggered = false;

  constructor() {
    this.frame = async(time: number) => {
      if (this._stop) return;
      const seconds = Math.min(1, (time - this.lastTime) / 1000);
      this.lastTime = time;
      await this.body(seconds);
      requestAnimationFrame(this.frame);
    }
    
    document.addEventListener('keydown', this.onKey.bind(this, true), false);
    document.addEventListener('keyup', this.onKey.bind(this, false), false);
    
    document.addEventListener('mousedown', this.onMouse.bind(this, true), false);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('mouseup', this.onMouse.bind(this, false), false);
    
    document.addEventListener('touchstart', this.onMouse.bind(this, true), false);
    document.addEventListener('touchmove', this.onMouseMove.bind(this), false);
    document.addEventListener('touchend', this.onMouse.bind(this, false), false);
  }

  setLoop(body: (seconds: number) => void) {
    this.body = body;
    return this;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    return this;
  }

  setUpdate(update: ControlUpdater) {
    this.update = update;
    return this;
  }

  setInputMap(kc: InputCodes, mc: InputCodes) {
    const { keys } = this;
    let update = false;
    for (const k of Object.keys(keys)) {
      update = update || keys[k];
      keys[k] = false;
    }

    if (update) this.update(keys, this.mouse);

    this.keyCodes = kc;
    const rk: ReverseCodes = {};
    for (const [k,v] of Object.entries(kc)) {
      const l = rk[v]||[];
      l.push(+k);
      rk[v] = l;
    }
    this.reverseKey = rk;
    
    this.mouseCodes = mc;
    const rm: ReverseCodes = {};
    for (const [k,v] of Object.entries(mc)) {
      const l = rm[v]||[];
      l.push(+k);
      rm[v] = l;
    }
    this.reverseMouse = rm;

    for (const [keyCode, v] of Object.entries(this.keyStates)) {
      const key = this.keyCodes[+keyCode];
      if (typeof key === 'undefined') {
        continue;
      }
    
      if (v) keys[key] = true;
    }

    for (const [button, v] of Object.entries(this.mouseStates)) {
      const key = this.keyCodes[+button];
      if (typeof key === 'undefined') {
        continue;
      }
    
      if (v) keys[key] = true;
    }

    return this;
  }

  private onMouse(val: boolean, e: Event) {
    const code = e instanceof MouseEvent ? e.button : 0;
    this.mouseStates[code] = val;
    const key = this.mouseCodes[code];
    if (typeof key === 'undefined') {
      return;
    }

    const { keys } = this;

    if (val) {
      if (keys[key]) return;
      keys[key] = true;
      this.controlsActive = true;
    } else {
      if (!keys[key]) return;
      const { mouseStates } = this;
      for (const code of this.reverseMouse[key]) {
        if(mouseStates[code]) return;
      }
      keys[key] = false;
    }

    this.controlsTriggered = true;
    this.update(keys, this.mouse);
  }

  private onMouseMove(e: Event) {
    const { width, height, mouse, keys } = this;
    const [pageX, pageY] = GetMousePosition(e);
    mouse.mouseX = 1 - 2 * pageX / width;
    mouse.mouseY = 1 - 2 * pageY / height;
    
    this.controlsTriggered = true;
    this.update(keys, mouse);
  }

  private onKey(val: boolean, e: KeyboardEvent) {
    const { keyCode } = e;
    this.keyStates[keyCode] = val;
    const key = this.keyCodes[keyCode];
    if (typeof key === 'undefined') {
      return;
    }
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
  
    const { keys } = this;

    if (val) {
      const keys = this.keys;
      if (keys[key]) return;
      keys[key] = true;
      this.controlsActive = true;
    } else {
      if (!keys[key]) return;
      const { keyStates } = this;
      for (const code of this.reverseKey[key]) {
        if(keyStates[code]) return;
      }
      keys[key] = false;
    }

    this.controlsTriggered = true;
    this.update(keys, this.mouse);
  }

  stop() {
    this._stop = true;
    return this;
  }

  start() {
    this._stop = false;
    requestAnimationFrame(time => {
      this.lastTime = time;
      this.frame(time);
      this.controlsTriggered = false;
    });

    return this;
  }
}