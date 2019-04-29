function createProgram(gl: WebGL2RenderingContext, shaders: WebGLShader[]) {
  const program = gl.createProgram() as WebGLProgram;

  for (const shader of shaders) {
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }

  gl.linkProgram(program);

  // Check the link status
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const err = `Error in program linking: ${ gl.getProgramInfoLog(program) }`;
    gl.deleteProgram(program);
    throw new Error(err);
  }

  return program;
}

function createShader(gl: WebGL2RenderingContext, shaderSource: string, shaderType: number) {
  const shader = gl.createShader(shaderType) as WebGLShader;

  // Load the shader source
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const err = `Error compiling shader '${ shader }': ${ gl.getShaderInfoLog(shader) }`;
    gl.deleteShader(shader);
    throw new Error(err);
  }

  return shader;
}

async function loadShaderFromScript(gl: WebGL2RenderingContext, scriptId: string, shaderType?: number) {
  const shaderScript = document.getElementById(scriptId) as HTMLScriptElement;

  if (!shaderScript) {
    throw ("*** Error: unknown script element" + scriptId);
  }

  const sourcePromise: Promise<string> = shaderScript.src ?
    new Promise(function(accept,reject) {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => accept(xhr.responseText));
      xhr.addEventListener("error", () => reject(new Error("Failed to load script")));
      xhr.open("GET", shaderScript.src);
      xhr.send();
    }):Promise.resolve(shaderScript.text);

  if (!shaderType) {
    switch (shaderScript.type) {
    case "x-shader/x-vertex":
      shaderType = gl.VERTEX_SHADER;
      break;
    case "x-shader/x-fragment":
      shaderType = gl.FRAGMENT_SHADER;
    }
  }

  if (shaderType !== gl.VERTEX_SHADER && shaderType !== gl.FRAGMENT_SHADER) {
    throw ("*** Error: unknown shader type");
  }

  return createShader(gl, await sourcePromise, shaderType);
}

export default async function createProgramFromScripts(gl: WebGL2RenderingContext, scriptIds: string[]) {
  return createProgram(gl, await Promise.all(
    scriptIds.map(id =>  loadShaderFromScript(gl, id))
  ));
}
