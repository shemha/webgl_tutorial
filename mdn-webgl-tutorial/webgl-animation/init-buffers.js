function initBuffers(gl) {
  const positionBuffer = initPositionBuffer(gl);
  const colorBuffer = initColorBuffer(gl);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

function initPositionBuffer(gl) {
  // 正方形の位置のバッファを作成
  const positionBuffer = gl.createBuffer();

  // バッファを操作・適用するために、positionBufferを選択
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // 正方形の位置の配列を作成
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // WebGL に位置のリストを渡し、形状を構築
  // まず、JavaScript の型付き配列である Float32Array を作成し、現在のバッファに流し込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // 作成した正方形の位置のバッファを返す
  return positionBuffer;
}

function initColorBuffer(gl) {
  const colors = [
    // 白
    1.0, 1.0, 1.0, 1.0,
    // 赤
    1.0, 0.0, 0.0, 1.0,
    // 緑
    0.0, 1.0, 0.0, 1.0,
    // 青
    0.0, 0.0, 1.0, 1.0,
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return colorBuffer;
}

// initBuffers 関数を外部で参照できるようにする
export { initBuffers };
