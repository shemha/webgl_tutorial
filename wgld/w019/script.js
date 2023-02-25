onload = function () {
  /*-- 
  初期化処理
   --*/

  // canvasエレメントを取得
  var c = document.getElementById("canvas");
  c.width = 500;
  c.height = 300;

  // チェックボックスの参照を取得
  var che_culling = document.getElementById("cull");
  var che_front = document.getElementById("front");
  var che_depth_test = document.getElementById("depth");

  // webglコンテキストを取得
  var gl = c.getContext("webgl");

  /*-- 
  シェーダとプログラムオブジェクトの生成
   --*/

  // 頂点シェーダとフラグメントシェーダの生成
  var v_shader = create_shader("vs");
  var f_shader = create_shader("fs");

  // プログラムオブジェクトの生成とリンク
  var prg = create_program(v_shader, f_shader);

  /*-- 
  頂点バッファ( VBO )とインデックスバッファ( IBO )の生成と通知
   --*/

  // attributeLocationを配列に取得
  var attLocation = new Array(2);
  // 頂点シェーダの属性変数"position"を取得
  attLocation[0] = gl.getAttribLocation(prg, "position");
  // 頂点シェーダの属性変数"color"を取得
  attLocation[1] = gl.getAttribLocation(prg, "color");

  // attributeの要素数を配列に格納
  var attStride = new Array(2);
  attStride[0] = 3;
  attStride[1] = 4;

  // 頂点の位置情報を格納する配列
  var position = [
    // 頂点1つ目(x, y, z)
    0.0, 1.0, 0.0,
    // 頂点2つ目(x, y, z)
    1.0, 0.0, 0.0,
    // 頂点3つ目(x, y, z)
    -1.0, 0.0, 0.0,
    // 頂点4つ目(x, y, z)
    0.0, -1.0, 0.0,
  ];

  // 頂点の色情報を格納する配列
  var color = [
    // 頂点1つ目(r, g, b, a)
    1.0, 0.0, 0.0, 1.0,
    // 頂点2つ目(r, g, b, a)
    0.0, 1.0, 0.0, 1.0,
    // 頂点3つ目(r, g, b, a)
    0.0, 0.0, 1.0, 1.0,
    // 頂点4つ目(r, g, b, a)
    1.0, 1.0, 1.0, 1.0,
  ];

  // 頂点のインデックスを格納する配列
  var index = [
    // 1つ目の三角形の頂点の描画順
    0, 1, 2,
    // 2つ目の三角形の頂点の描画順
    1, 2, 3,
  ];

  // VBOの生成
  var pos_vbo = create_vbo(position);
  var col_vbo = create_vbo(color);

  // VBO を登録する
  set_attribute([pos_vbo, col_vbo], attLocation, attStride);

  // IBOの生成
  var ibo = create_ibo(index);

  // IBOをバインドして登録する
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  // uniformLocationの自作変数"mvpMatrix"を取得
  var uniLocation = gl.getUniformLocation(prg, "mvpMatrix");

  /*-- 
  座標変換行列の生成と通知
   --*/

  // minMatrix.js を用いた行列関連処理
  // matIVオブジェクトを生成
  var m = new matIV();

  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル変換行列
  var vMatrix = m.identity(m.create()); // ビュー変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション変換行列
  var tmpMatrix = m.identity(m.create()); // 一時保存用の行列
  var mvpMatrix = m.identity(m.create()); // 最終座標変換行列

  // ビュー×プロジェクション座標変換行列
  // カメラの位置は、原点から上に 0.0 、後ろに 5.0
  m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  // 視野角を 45 度、アスペクト比は canvas のサイズ
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  // あらかじめ二つの行列を掛け合わせ保持しておく
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // カウンタの宣言
  var count = 0;

  // 深度テストの比較方法を指定
  gl.depthFunc(gl.LEQUAL);

  // 恒常ループ
  (function () {
    // checkBoxの値によってカリングと深度テストを設定
    if (che_culling.checked) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
    if (che_front.checked) {
      gl.frontFace(gl.CCW);
    } else {
      gl.frontFace(gl.CW);
    }
    if (che_depth_test.checked) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }

    // canvasを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;
    var x = Math.cos(rad) * 1.5;
    var z = Math.sin(rad) * 1.5;

    // モデル座標変換行列の生成(X軸による回転)
    m.identity(mMatrix);
    m.translate(mMatrix, [x, 0.0, z], mMatrix);
    m.rotate(mMatrix, rad, [1, 0, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // モデル座標変換行列の生成(Y軸による回転)
    m.identity(mMatrix);
    m.translate(mMatrix, [-x, 0.0, -z], mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    setTimeout(arguments.callee, 1000 / 30);
  })();

  // シェーダを生成してコンパイルする関数
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

      // それ以外のtype属性は無視
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

  // VBO (頂点バッファ)を生成する関数
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
};
