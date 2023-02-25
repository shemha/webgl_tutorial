onload = function () {
  /*-- 
  初期化処理
   --*/

  // canvasエレメントを取得
  var c = document.getElementById("canvas");
  c.width = 300;
  c.height = 300;

  // webglコンテキストを取得
  var gl = c.getContext("webgl");

  // 画面を完全な黒で初期化
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // 深度(奥行き)の初期設定
  gl.clearDepth(1.0);

  // 画面をクリア(初期化)する
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /*-- 
  シェーダとプログラムオブジェクトの生成
   --*/

  // 頂点シェーダとフラグメントシェーダの生成
  var v_shader = create_shader("vs");
  var f_shader = create_shader("fs");

  // プログラムオブジェクトの生成とリンク
  var prg = create_program(v_shader, f_shader);

  /*-- 
  頂点バッファ( VBO )の生成と通知
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
  // 1, 4, 7はX座標を、2, 5, 8はY座標を、3, 6, 9はZ座標を表す
  var position = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];

  // 頂点の色情報を格納する配列
  // 1, 5, 9はR値、2, 6, 10はG値、3, 7, 11はB値、4, 8, 12はalpha値を表す
  var color = [1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0];

  // VBOの生成
  var pos_vbo = create_vbo(position);
  var col_vbo = create_vbo(color);

  // VBO を登録する
  set_attribute([pos_vbo, col_vbo], attLocation, attStride);

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
  // カメラの位置は、原点から上に 0.0 、後ろに 3.0
  m.lookAt([0.0, 0.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
  // 視野角を 90 度、アスペクト比は canvas のサイズ
  m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);
  // あらかじめ二つの行列を掛け合わせ保持しておく
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // 一つ目のモデルを移動するためのモデル座標変換行列
  m.translate(mMatrix, [1.5, 0.0, 0.0], mMatrix);
  // モデル×ビュー×プロジェクション(一つ目のモデル)
  m.multiply(tmpMatrix, mMatrix, mvpMatrix);
  // uniformLocationへ座標変換行列"mvpMatrix"を登録
  gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
  // モデルの描画
  // 第一引数は頂点をどのように利用して描画するかを指定、第二引数は何番目の頂点から利用するか
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // 二つ目のモデルを移動するためのモデル座標変換行列
  m.identity(mMatrix);
  m.translate(mMatrix, [-1.5, 0.0, 0.0], mMatrix);
  // モデル×ビュー×プロジェクション(二つ目のモデル)
  m.multiply(tmpMatrix, mMatrix, mvpMatrix);
  // uniformLocationへ座標変換行列を登録し描画する(二つ目のモデル)
  gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // コンテキストの再描画
  gl.flush();

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
};
