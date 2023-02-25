// canvas とクォータニオンをグローバルに扱う
var c;
var q = new qtnIV();
var qt = q.identity(q.create());

// マウスムーブイベントに登録する処理
function mouseMove(e) {
  var cw = c.width;
  var ch = c.height;
  var wh = 1 / Math.sqrt(cw * cw + ch * ch);
  var x = e.clientX - c.offsetLeft - cw * 0.5;
  var y = e.clientY - c.offsetTop - ch * 0.5;
  var sq = Math.sqrt(x * x + y * y);
  var r = sq * 2.0 * Math.PI * wh;
  if (sq != 1) {
    sq = 1 / sq;
    x *= sq;
    y *= sq;
  }
  q.rotate(r, [y, x, 0.0], qt);
}

onload = function () {
  // canvasエレメントを取得
  c = document.getElementById("canvas");
  c.width = 512;
  c.height = 512;

  // イベント処理
  c.addEventListener("mousemove", mouseMove, true);

  // webglコンテキストを取得
  var gl = c.getContext("webgl");

  // シェーダの準備と各種ロケーションの取得
  var v_shader = create_shader("vs");
  var f_shader = create_shader("fs");
  var prg = create_program(v_shader, f_shader);
  var attLocation = [];
  attLocation[0] = gl.getAttribLocation(prg, "position");
  attLocation[1] = gl.getAttribLocation(prg, "normal");
  attLocation[2] = gl.getAttribLocation(prg, "color");
  var attStride = [];
  attStride[0] = 3;
  attStride[1] = 3;
  attStride[2] = 4;
  var uniLocation = [];
  uniLocation[0] = gl.getUniformLocation(prg, "mvpMatrix");
  uniLocation[1] = gl.getUniformLocation(prg, "invMatrix");
  uniLocation[2] = gl.getUniformLocation(prg, "lightDirection");

  // トーラスモデル
  var torusData = torus(32, 32, 2.0, 3.0);
  var tIndex = create_ibo(torusData.i);

  // インターリーブ配列を作る
  var stride = 0;
  attStride.map(function (value) {
    stride += value;
  });
  var vertexBufferData = [];
  (function () {
    var i, j, k, l, m;
    var position = torusData.p;
    var normal = torusData.n;
    var color = torusData.c;
    for (i = 0, j = position.length / 3; i < j; ++i) {
      k = attStride[0] * i;
      l = attStride[1] * i;
      m = attStride[2] * i;
      vertexBufferData.push(
        position[k],
        position[k + 1],
        position[k + 2],
        normal[l],
        normal[l + 1],
        normal[l + 2],
        color[m],
        color[m + 1],
        color[m + 2],
        color[m + 3]
      );
    }
  })();

  // VBO を生成する
  var tVBO = create_vbo(vertexBufferData);

  // VBO をバインドする（create_vbo 関数では汎用性のため最後にバッファをアンバインドしているので）
  gl.bindBuffer(gl.ARRAY_BUFFER, tVBO);

  // attributeLocationを有効化し登録する
  var byteLength = stride * 4; // 32bit === 4byte
  gl.enableVertexAttribArray(attLocation[0]);
  gl.vertexAttribPointer(
    attLocation[0],
    attStride[0],
    gl.FLOAT,
    false,
    byteLength,
    0
  );
  gl.enableVertexAttribArray(attLocation[1]);
  gl.vertexAttribPointer(
    attLocation[1],
    attStride[1],
    gl.FLOAT,
    false,
    byteLength,
    12
  );
  gl.enableVertexAttribArray(attLocation[2]);
  gl.vertexAttribPointer(
    attLocation[2],
    attStride[2],
    gl.FLOAT,
    false,
    byteLength,
    24
  );

  // IBO をバインドする
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // 背景の初期化設定
  gl.clearColor(0.3, 0.3, 0.3, 1.0);
  gl.clearDepth(1.0);

  // ライトの向き
  var lightDirection = [1.0, 1.0, 1.0];

  // カウンタの宣言
  var count = 0;
  render();

  // 恒常ループ
  function render() {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // canvasをクリア
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビュー×プロジェクション座標変換行列
    var eyePosition = [];
    var camUpDirection = [];
    q.toVecIII([0.0, 25.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 50.0, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // トーラスをレンダリング
    for (var i = 0; i < 9; i++) {
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 2 * Math.PI) / 9, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 15.0], mMatrix);
      m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
      gl.uniform3fv(uniLocation[2], lightDirection);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    requestAnimationFrame(render);
  }

  // シェーダを生成する関数
  function create_shader(id) {
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if (!scriptElement) {
      return;
    }

    // scriptタグのtype属性をチェック
    switch (scriptElement.type) {
      // 頂点シェーダの場合
      case "x-shader/x-vertex":
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;

      // フラグメントシェーダの場合
      case "x-shader/x-fragment":
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // 成功していたらシェーダを返して終了
      return shader;
    } else {
      // 失敗していたらエラーログをアラートする
      alert(gl.getShaderInfoLog(shader));
    }
  }

  // プログラムオブジェクトを生成しシェーダをリンクする関数
  function create_program(vs, fs) {
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    // シェーダをリンク
    gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // 成功していたらプログラムオブジェクトを有効にする
      gl.useProgram(program);

      // プログラムオブジェクトを返して終了
      return program;
    } else {
      // 失敗していたらエラーログをアラートする
      alert(gl.getProgramInfoLog(program));
    }
  }

  // VBOを生成する関数
  function create_vbo(data) {
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // バッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
  }

  // IBOを生成する関数
  function create_ibo(data) {
    // バッファオブジェクトの生成
    var ibo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    // バッファにデータをセット
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Int16Array(data),
      gl.STATIC_DRAW
    );

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // 生成したIBOを返して終了
    return ibo;
  }
};
