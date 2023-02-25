// Canvasを作成してbodyに追加します。
const canvas = document.createElement("canvas");
canvas.width = 500;
canvas.height = 500;
document.body.appendChild(canvas);

// WebGL2のコンテキストを取得します。
const gl = canvas.getContext("webgl2");

const loadVertexShader = fetch("vertex_shader.glsl");
const loadFragmentShader = fetch("fragment_shader.glsl");

Promise.all([loadVertexShader, loadFragmentShader])
  .then((responses) => Promise.all([responses[0].text(), responses[1].text()]))
  .then((shaderSources) => {
    const vertexShaderSource = shaderSources[0];
    const fragmentShaderSource = shaderSources[1];

    // バーテックスシェーダをコンパイルします。
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    // コンパイル成功したか否かをチェックします。
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
    gl.shaderSource(fragmentShader, fragmentShaderSource);
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

    // リンクできたかどうかを確認します。
    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linkStatus) {
      const info = gl.getProgramInfoLog(program);
      console.log(info);
    }

    // プログラムを使用します。
    gl.useProgram(program);

    // データを転送するためのバッファを作成します。
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();

    // バーテックスシェーダのin変数の位置を取得します。
    const vertexAttribLocation = gl.getAttribLocation(
      program,
      "vertexPosition"
    );
    const colorAttribLocation = gl.getAttribLocation(program, "color");

    const VERTEX_SIZE = 3; // vec3
    const COLOR_SIZE = 4; // vec4

    const STRIDE = (3 + 4) * Float32Array.BYTES_PER_ELEMENT;
    const POSITION_OFFSET = 0;
    const COLOR_OFFSET = 3 * Float32Array.BYTES_PER_ELEMENT;

    // バッファをバインドします。
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // in変数を有効化します。
    gl.enableVertexAttribArray(vertexAttribLocation);
    gl.enableVertexAttribArray(colorAttribLocation);

    // in変数とバッファを結び付けます。
    // 第5引数にstride、第6引数にoffsetを指定します。
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

    // インターリーブされた頂点情報です。
    const vertices = new Float32Array([
      -0.5,
      0.5,
      0.0, // xyz
      1.0,
      0.0,
      0.0,
      1.0, // rgba
      -0.5,
      -0.5,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      0.5,
      -0.5,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);

    // 描画に使うインデックス情報です。
    // 0-1-2と1-3-2というふたつの三角形を指定します。
    const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    // バインドしてデータを転送します。
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // 四角形を描画します。
    const indexSize = indices.length;
    gl.drawElements(gl.TRIANGLES, indexSize, gl.UNSIGNED_SHORT, 0);

    // WebGLに描画を促します。
    gl.flush();
  });
