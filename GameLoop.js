class GameLoop {
	constructor(body) {
		"use strict";
		this.lastTime = 0;
		this.body = body;
		this._stop = false;
	}
	stop() {
		"use strict";
		this._stop = true;
	}
	start() {
		"use strict";
		const that = this;
		this._stop = false;
		requestAnimationFrame(function frame(time) {
			if (that._stop) {
				return;
			}
			const seconds = (time - that.lastTime) / 1000;
			that.lastTime = time;
			that.body(seconds);
			requestAnimationFrame(frame);
		});
	}
}

module.exports = GameLoop;