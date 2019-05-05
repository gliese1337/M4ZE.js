export default class GameLoop {
  private _stop = false;
  private lastTime = 0;

  constructor(private body: (seconds: number) => void) { }
  
  stop() {
    this._stop = true;
  }

  start() {
    this._stop = false;
    const frame = (time: number) => {
      if (this._stop) return;
      const seconds = Math.min(1, (time - this.lastTime) / 1000);
      this.lastTime = time;
      this.body(seconds);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}