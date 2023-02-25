// canvas と クォータニオン、ビデオエレメントをグローバルに扱う
var c;
var q = new qtnIV();
var qt = q.identity(q.create());
var video;

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

// 再生可能なビデオタイプを調べる
function checkVideoType() {
  if (video.canPlayType("video/mp4") === "maybe") {
    return "mp4";
  } else if (video.canPlayType("video/webm") === "maybe") {
    return "webm";
  } else {
    return null;
  }
}

// オンロードイベント
onload = function () {
  // canvasエレメントを取得
  c = document.getElementById("canvas");
  c.width = 512;
  c.height = 512;

  // input エレメントへの参照を取得
  var button = document.getElementById("playButton");

  // input が押されたらレンダリング開始
  button.addEventListener(
    "click",
    function () {
      button.value = "running";
      button.disabled = true;
      video.play();
      render();
    },
    true
  );

  // ビデオエレメントを生成
  video = document.createElement("video");

  // ビデオタイプのチェック
  var videoExt = checkVideoType();
  if (videoExt === null) {
    alert("not supported");
    return;
  }

  // ビデオエレメントにキャッシュ完了イベントを登録
  video.addEventListener(
    "canplaythrough",
    function () {
      if (button.value !== "running") {
        button.value = "can play video";
        button.disabled = false;
      }
    },
    true
  );

  // ビデオエレメントのリピート再生を設定
  video.addEventListener(
    "ended",
    function () {
      video.play();
    },
    true
  );

  // ソースファイルの読み込み
  video.src = "video." + videoExt;
};

function render() {
  // マウスイベント処理
  c.addEventListener("mousemove", mouseMove, true);

  // webglコンテキストを取得
  var gl = c.getContext("webgl");

  // 頂点シェーダとフラグメントシェーダ、プログラムオブジェクトの生成
  var v_shader = create_shader("vs");
  var f_shader = create_shader("fs");
  var prg = create_program(v_shader, f_shader);

  // attributeLocationを配列に取得
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, "position");
  attLocation[1] = gl.getAttribLocation(prg, "color");
  attLocation[2] = gl.getAttribLocation(prg, "texCoord");

  // attributeの要素数を配列に格納
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 3;
  attStride[2] = 2;

  // キューブモデル
  var cubeData = cube(2.0, [1.0, 1.0, 1.0, 1.0]);
  var cPosition = create_vbo(cubeData.p);
  var cColor = create_vbo(cubeData.c);
  var cTexCoord = create_vbo(cubeData.t);
  var cVBOList = [cPosition, cColor, cTexCoord];
  var cIndex = create_ibo(cubeData.i);

  // 球体モデル
  var sphereData = sphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
  var sPosition = create_vbo(sphereData.p);
  var sColor = create_vbo(sphereData.c);
  var sTexCoord = create_vbo(sphereData.t);
  var sVBOList = [sPosition, sColor, sTexCoord];
  var sIndex = create_ibo(sphereData.i);

  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, "mvpMatrix");
  uniLocation[1] = gl.getUniformLocation(prg, "texture");

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

  // カウンタ初期化
  var count = 0;

  // テクスチャ関連
  var videoTexture = gl.createTexture(gl.TEXTURE_2D);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  //	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // canvasを初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャを更新する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 7.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0.0, 0.0, 0.0], camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 10.0, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // 球体をレンダリング
    set_attribute(sVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.identity(mMatrix);
    m.translate(mMatrix, [1.5, 0.0, 0.0], mMatrix);
    m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1i(uniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // キューブをレンダリング
    set_attribute(cVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.translate(mMatrix, [-1.5, 0.0, 0.0], mMatrix);
    m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
    m.rotate(mMatrix, Math.PI, [0.0, 0.0, 1.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1i(uniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    requestAnimationFrame(arguments.callee);
  })();

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

  // VBOをバインドし登録する関数
  function set_attribute(vbo, attL, attS) {
    // 引数として受け取った配列を処理する
    for (var i in vbo) {
      // バッファをバインドする
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

      // attributeLocationを有効にする
      gl.enableVertexAttribArray(attL[i]);

      // attributeLocationを通知し登録する
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
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
}
