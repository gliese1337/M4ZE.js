function GameLoop(body){
	"use strict";
	this.lastTime = 0;
	this.body = body;
	this._stop = false;
}

GameLoop.prototype.stop = function(){
	"use strict";
	this._stop = true;
};

GameLoop.prototype.start = function(){
	"use strict";
	const that = this;
	this._stop = false;
	requestAnimationFrame(function frame(time){
		if(that._stop){ return; }
		const seconds = (time - that.lastTime) / 1000;
		that.lastTime = time;
		that.body(seconds);
		requestAnimationFrame(frame);
	});
};

module.exports = GameLoop;