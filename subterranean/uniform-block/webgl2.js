// Canvasを作成してbodyに追加します。
const canvas = document.createElement("canvas");
canvas.width = 500;
canvas.height = 500;
document.body.appendChild(canvas);

const gl = canvas.getContext("webgl2");

// シェーダを読み込みPromiseを返します。
function loadShaders() {
  const loadVertexShader = fetch("vertex_shader.glsl").then((res) =>
    res.text()
  );
  const loadFragmentShader = fetch("fragment_shader.glsl").then((res) =>
    res.text()
  );
  return Promise.all([loadVertexShader, loadFragmentShader]);
}

// シェーダのソースからシェーダプログラムを作成し、
// Programを返します。
function createShaderProgram(vsSource, fsSource) {
  // バーテックスシェーダをコンパイルします。
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vsSource);
  gl.compileShader(vertexShader);

  const vShaderCompileStatus = gl.getShaderParameter(
    vertexShader,
    gl.COMPILE_STATUS
  );
  if (!vShaderCompileStatus) {
    const info = gl.getShaderInfoLog(vertexShader);
    console.log(info);
  }

  // フラグメントシェーダについても同様にします。
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fsSource);
  gl.compileShader(fragmentShader);

  const fShaderCompileStatus = gl.getShaderParameter(
    fragmentShader,
    gl.COMPILE_STATUS
  );
  if (!fShaderCompileStatus) {
    const info = gl.getShaderInfoLog(fragmentShader);
    console.log(info);
  }

  // シェーダプログラムを作成します。
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linkStatus) {
    const info = gl.getProgramInfoLog(program);
    console.log(info);
  }

  // プログラムを使用します。
  gl.useProgram(program);

  return program;
}

// バッファを作成し返します。
function createBuffer(type, typedDataArray) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, typedDataArray, gl.STATIC_DRAW);
  gl.bindBuffer(type, null); // バインド解除

  return buffer;
}

// シェーダを読み込み終わったら開始します。
loadShaders().then((shaderSources) => {
  //
  // プログラムの作成
  //
  const vertexShaderSource = shaderSources[0];
  const fragmentShaderSource = shaderSources[1];

  const program = createShaderProgram(vertexShaderSource, fragmentShaderSource);

  //
  // 設定の有効化
  //
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  //
  // uniform変数の設定
  //
  const scale = mat4.create();
  mat4.scale(scale, scale, [1, 1, 1]);
  const rotation = mat4.create();
  mat4.rotateZ(rotation, rotation, Math.PI / 8);
  const translation = mat4.create();
  mat4.translate(translation, translation, [40, 0, -20]);
  const model = mat4.create();
  mat4.multiply(model, model, translation);
  mat4.multiply(model, model, rotation);
  mat4.multiply(model, model, scale);

  const cameraPosition = [0, 60, 90];
  const lookAtPosition = [0, 0, 0];
  const upDirection = [0, 1, 0];
  const view = mat4.create();
  mat4.lookAt(view, cameraPosition, lookAtPosition, upDirection);

  const left = -40;
  const right = 40;
  const top = 40;
  const bottom = -40;
  const near = 30; // nearとfarは「Z座標」ではなく「距離」を表す。
  const far = 150; // つまり、0 < near < far を満たす値を設定する。
  const projection = mat4.create();
  mat4.frustum(projection, left, right, bottom, top, near, far);

  const modelArray = Array.from(model);
  const viewArray = Array.from(view);
  const projArray = Array.from(projection);
  const mvp = new Float32Array(modelArray.concat(viewArray).concat(projArray));

  // ブロックのインデックスを取得します。
  const uniformBlockIndex = gl.getUniformBlockIndex(program, "Matrices");

  // バインディングポイントを好きに指定します。
  const bindingPoint = 0;

  // uniformブロックをバインディングポイントにバインドします。
  gl.uniformBlockBinding(program, uniformBlockIndex, bindingPoint);

  // バッファを作り、書き込みます。
  const uniformBuffer = createBuffer(gl.UNIFORM_BUFFER, mvp);

  // バッファをバインディングポイントにバインドします。
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, uniformBuffer);

  //
  // 描画データ
  //
  const vertices = new Float32Array([
    -30.0,
    30.0,
    0.0, // 座標
    0.0,
    1.0,
    0.0,
    1.0, // 色
    -30.0,
    -30.0,
    0.0,
    1.0,
    0.0,
    0.0,
    1.0,
    30.0,
    30.0,
    0.0,
    1.0,
    0.0,
    0.0,
    1.0,
    30.0,
    -30.0,
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
  ]);
  const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

  //
  // バッファの設定
  //
  const vertexBuffer = createBuffer(gl.ARRAY_BUFFER, vertices);
  const indexBuffer = createBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);

  const vertexAttribLocation = gl.getAttribLocation(program, "vertexPosition");
  const colorAttribLocation = gl.getAttribLocation(program, "color");

  const VERTEX_SIZE = 3; // vec3
  const COLOR_SIZE = 4; // vec4

  const STRIDE = (3 + 4) * Float32Array.BYTES_PER_ELEMENT;
  const POSITION_OFFSET = 0;
  const COLOR_OFFSET = 3 * Float32Array.BYTES_PER_ELEMENT;

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.enableVertexAttribArray(vertexAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);

  gl.vertexAttribPointer(
    vertexAttribLocation,
    VERTEX_SIZE,
    gl.FLOAT,
    false,
    STRIDE,
    POSITION_OFFSET
  );
  gl.vertexAttribPointer(
    colorAttribLocation,
    COLOR_SIZE,
    gl.FLOAT,
    false,
    STRIDE,
    COLOR_OFFSET
  );

  //
  // 描画処理
  //
  const indexSize = indices.length;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.drawElements(gl.TRIANGLES, indexSize, gl.UNSIGNED_SHORT, 0);
  gl.flush();
});
