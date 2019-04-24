function createProgram(gl, shaders){
	"use strict";
	const program = gl.createProgram();

	for(const shader of shaders){
		gl.attachShader(program, shader);
		gl.deleteShader(shader);
	}

	gl.linkProgram(program);

	// Check the link status
	const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
	if(!linked){
		console.error("Error in program linking:" +
			gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}

	return program;
}

function createShader(gl, shaderSource, shaderType) {
	const shader = gl.createShader(shaderType);

	// Load the shader source
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if(!compiled){
		console.error("*** Error compiling shader '" + shader + "':" +
			gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function loadShaderFromScript(gl, scriptId, shaderType){
	const shaderScript = document.getElementById(scriptId);

	if(!shaderScript){
		throw ("*** Error: unknown script element" + scriptId);
	}

	const sourcePromise = shaderScript.src ?
		new Promise(function(accept,reject){
			const xhr = new XMLHttpRequest();

			xhr.addEventListener("load", function(){
				accept(this.responseText);
			});

			xhr.addEventListener("error", function(){
				reject(new Error("Failed to load script"));
			});

			xhr.open("GET", shaderScript.src);
			xhr.send();
		}):Promise.resolve(shaderScript.text);

	if(!shaderType){
		switch(shaderScript.type){
		case "x-shader/x-vertex":
			shaderType = gl.VERTEX_SHADER;
			break;
		case "x-shader/x-fragment":
			shaderType = gl.FRAGMENT_SHADER;
		}
	}

	if(shaderType !== gl.VERTEX_SHADER && shaderType !== gl.FRAGMENT_SHADER){
		throw ("*** Error: unknown shader type");
	}

	return sourcePromise.then(source => createShader(gl, source, shaderType));
}

function createProgramFromScripts(gl, scriptIds){
	const shaders = scriptIds.map(id =>
		loadShaderFromScript(gl, id)
	);

	return Promise.all(shaders).then(shaders =>
		createProgram(gl, shaders)
	);
}

module.exports = createProgramFromScripts;