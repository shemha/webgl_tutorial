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

  // attributeLocationの取得
  var attLocation = gl.getAttribLocation(prg, "position");

  // attributeの要素数(この場合は xyz の3要素)
  var attStride = 3;

  /*-- 
  頂点バッファ( VBO )の生成と通知
   --*/
  // モデル(頂点)データを格納する配列
  // 1, 4, 7はX座標を、2, 5, 8はY座標を、3, 6, 9はZ座標を表す
  var vertex_position = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];

  // VBOの生成
  var vbo = create_vbo(vertex_position);

  // VBOをバインド
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // attribute属性を有効にする
  gl.enableVertexAttribArray(attLocation);

  // attribute属性を登録
  gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);

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
  var mvpMatrix = m.identity(m.create()); // 最終座標変換行列

  // ビュー座標変換行列
  // カメラの位置は、原点から上に 1.0 、後ろに 3.0
  m.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);

  // プロジェクション座標変換行列
  // 視野角を 90 度、アスペクト比は canvas のサイズ
  m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);

  // 各行列を掛け合わせ座標変換行列を完成させる
  m.multiply(pMatrix, vMatrix, mvpMatrix); // p に v を掛ける
  m.multiply(mvpMatrix, mMatrix, mvpMatrix); // さらに m を掛ける

  // uniformLocationの自作変数"mvpMatrix"を取得
  var uniLocation = gl.getUniformLocation(prg, "mvpMatrix");

  // uniformLocationへ座標変換行列"mvpMatrix"を登録
  gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

  /*-- 
  モデルの描画とコンテキストの再描画
   --*/
  // モデルの描画
  // 第一引数は頂点をどのように利用して描画するかを指定
  // 第二引数は何番目の頂点から利用するか
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
};
