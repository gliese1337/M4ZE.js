export default class Overlay {
  private ctx: CanvasRenderingContext2D;
  private fpsw: number[] = [];
  public progress = 0;

  constructor(private canvas: HTMLCanvasElement, private len: number) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }
  reticle(x: number, y: number, dist: number) {
    const { ctx } = this;
    x += this.canvas.width / 2;
    y += this.canvas.height / 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00FF00";
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, 2 * Math.PI, false);
    ctx.arc(x, y, 17, 0, 2 * Math.PI, false);
    ctx.moveTo(x - 25, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 25, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 25);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 12);
    ctx.lineTo(x + 25, y + 25);
    ctx.lineTo(x + 55, y + 25);
    ctx.stroke();
    ctx.font = "15px Calibri";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#00FF00";
    const d = Math.round(100 * dist) / 10;
    ctx.fillText(d + (d == Math.floor(d) ? ".0" : ""), x + 28, y + 24);
  }
  tick(seconds: number) {
    const { canvas, ctx, fpsw, len, progress } = this;
    const { height, width } = canvas;
    if (fpsw.length > 20) {
      fpsw.shift();
    }
    fpsw.push(1 / seconds);
    const fps = Math.round(10 * fpsw.reduce((a, n) => a + n) / fpsw.length) / 10;
    ctx.clearRect(0, 0, width, height);
    ctx.font = "10px Calibri";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("FPS: " + fps + (fps === Math.floor(fps) ? ".0" : ""), 5, 10);
    // Draw panel
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height - 20);
    ctx.lineTo(45, height - 20);
    ctx.arcTo(85, height - 20, 85, height, 20);
    ctx.lineTo(85, height);
    ctx.closePath();
    ctx.fillStyle = "#0f0f0f";
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.font = "12px Calibri";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#02CC02";
    ctx.strokeStyle = "#02CC02";
    ctx.lineWidth = 1;
    ctx.translate(5, height - 16);
    
    ctx.fillText("Progress:", 0, 0);
    ctx.fillText(Math.round(100 * progress / len) + "%", 50, 0);
    ctx.restore();
  }
}
