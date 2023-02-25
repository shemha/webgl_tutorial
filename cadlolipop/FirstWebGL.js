"use strict";
class MyFirstWebGL {
  constructor(canvasWidth, canvasHeight, canvasId) {
    // GLのコンテキストを取得
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.canvas = document.getElementById(canvasId);
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.gl =
      this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl");

    // 頂点シェーダとフラグメントシェーダを読み込んでコンパイルする
    this.vertexShader = this.createShader("vertex_shader");
    this.fragmentShader = this.createShader("fragment_shader");
    this.program = this.createProgram(this.vertexShader, this.fragmentShader);

    // シェーダ内の頂点用attrib変数を取得する
    this.vertexPosAttribLocation = this.gl.getAttribLocation(
      this.program,
      "vertexPositionFromMain"
    );
    this.vertexColorAttribLocation = this.gl.getAttribLocation(
      this.program,
      "vertexColorFromMain"
    );
    // 上記のシェーダ内の受け取る変数がvec3かvec4か
    this.vertexPosAttribStride = 3;
    this.vertexColorAttribStride = 4;

    // perspective用のパラメータの初期値
    this.perspectiveAngle = 45.0; //画角
    this.perspectiveArea = new Array(0.1, 100000.0); //表示領域: 手前と奥
    // lookAt様のパラメータの初期値
    // カメラの位置x, y, z座標,
    // カメラが見ているポイントのx, y, z: 0, 0, 0だと原点
    // カメラの上がどこか: 0.0, 1.0, 0.0
    this.cameraPosXDirection = 1.0;
    this.lookAtArray = new Array(
      [4.0, 3.0, 3.0],
      [0.0, 0.0, 0.0], //原点
      [0.0, 1.0, 0.0]
    );
    this.mativ = new matIV();
    this.projectionMatrix = this.mativ.identity(this.mativ.create());
    this.mativ.perspective(
      this.perspectiveAngle,
      this.canvasWidth / this.canvasHeight,
      this.perspectiveArea[0],
      this.perspectiveArea[1],
      this.projectionMatrix
    );

    this.modelMatrix = this.mativ.identity(this.mativ.create());

    // 頂点座標
    // x1, y1, z1, x2, y2, z2, x3, y3, z3という感じで並べる
    this.vertexPosArray = new Array(
      -1.0,
      -1.0,
      0.0,
      1.0,
      -1.0,
      0.0,
      0.0,
      1.0,
      0.0
    );
    // 頂点色情報
    // r1, g1, b1, alfa1, r2, b2....
    this.vertexColorArray = new Array(
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      1.0
    );
  }

  draw() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 視点変更
    this.viewMatrix = this.mativ.identity(this.mativ.create());
    this.lookAtArray[0][0] += 0.1 * this.cameraPosXDirection;
    this.mativ.lookAt(
      this.lookAtArray[0],
      this.lookAtArray[1],
      this.lookAtArray[2],
      this.viewMatrix
    );
    if (this.lookAtArray[0][0] > 4.0) this.cameraPosXDirection = -1;
    else if (this.lookAtArray[0][0] < -4.0) this.cameraPosXDirection = 1;

    // MVP行列の作成
    let vpMatrix = this.mativ.identity(this.mativ.create());
    this.mativ.multiply(this.projectionMatrix, this.viewMatrix, vpMatrix);
    this.mvpMatrix = this.mativ.identity(this.mativ.create());
    this.mativ.multiply(vpMatrix, this.modelMatrix, this.mvpMatrix);

    // VBOの作成
    this.vboPos = this.createVBO(this.vertexPosArray);
    this.vboColor = this.createVBO(this.vertexColorArray);
    // VBOをバインド
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vboPos);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vboColor);
    // attribute属性を有効にする
    this.gl.enableVertexAttribArray(this.vertexPosAttribLocation);
    this.gl.enableVertexAttribArray(this.vertexColorAttribLocation);

    // attribute属性を登録
    this.gl.vertexAttribPointer(
      this.vertexPosAttribLocation,
      this.vertexPosAttribStride,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.vertexAttribPointer(
      this.vertexColorAttribLocation,
      this.vertexColorAttribStride,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // シェーダ用のMVP行列のuniform変数領域を取得する
    this.mvpMatrixUniformLocation = this.gl.getUniformLocation(
      this.program,
      "mvpMatrix"
    );
    // シェーダ内のMVP行列へ登録
    this.gl.uniformMatrix4fv(
      this.mvpMatrixUniformLocation,
      false,
      this.mvpMatrix
    );

    // 頂点の描画
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);

    //
    this.gl.flush();
  }

  createShader(id) {
    // シェーダを格納する変数
    let shader;

    // HTMLからscriptタグへの参照を取得
    let scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if (!scriptElement) {
      return;
    }

    // scriptタグのtype属性をチェック
    switch (scriptElement.type) {
      // 頂点シェーダの場合
      case "x-shader/x-vertex":
        shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        break;

      // フラグメントシェーダの場合
      case "x-shader/x-fragment":
        shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }

    // 生成されたシェーダにソースを割り当てる
    this.gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    this.gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      // 成功していたらシェーダを返して終了
      return shader;
    } else {
      // 失敗していたらエラーログをアラートする
      console.log(this.gl.getShaderInfoLog(shader));
    }
  }

  createProgram(vs, fs) {
    // プログラムオブジェクトの生成
    let program = this.gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);

    // シェーダをリンク
    this.gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      // 成功していたらプログラムオブジェクトを有効にする
      this.gl.useProgram(program);

      // プログラムオブジェクトを返して終了
      return program;
    } else {
      // 失敗していたらエラーログをアラートする
      console.log(this.gl.getProgramInfoLog(program));
    }
  }

  createVBO(vertexArray) {
    let vbo = this.gl.createBuffer();

    // バッファをバインドする
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);

    // バッファにデータをセット
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertexArray),
      this.gl.STATIC_DRAW
    );

    // バッファのバインドを無効化
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
  }
}

window.addEventListener("load", () => {
  window.myWebGL = new MyFirstWebGL(640, 480, "gl_canvas");
});

window.drawLoop = () => {
  window.webGlAnimationId = window.requestAnimationFrame(window.drawLoop);
  window.myWebGL.draw();
};

window.stopDrawLoop = () => {
  window.cancelAnimationFrame(window.webGlAnimationId);
};
