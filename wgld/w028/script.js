onload = function () {
  /*-- 
  初期化処理
   --*/

  // canvasエレメントを取得
  var c = document.getElementById("canvas");
  c.width = 750;
  c.height = 450;

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
  var attLocation = new Array();
  // 頂点シェーダの属性変数"position"を取得
  attLocation[0] = gl.getAttribLocation(prg, "position");
  // 頂点シェーダの属性変数"color"を取得
  attLocation[1] = gl.getAttribLocation(prg, "color");
  // 頂点シェーダの属性変数"textureCoord"を取得
  attLocation[2] = gl.getAttribLocation(prg, "textureCoord");

  // attributeの要素数を配列に格納
  var attStride = new Array();
  // positionの成分の数(x, y, z)
  attStride[0] = 3;
  // colorの成分の数(r, g, b, a)
  attStride[1] = 4;
  // textureCoordの成分の数(u, v)
  attStride[2] = 2;

  // 頂点の位置
  var position = [
    // 頂点0(x, y, z)
    -1.0, 1.0, 0.0,
    // 頂点1(x, y, z)
    1.0, 1.0, 0.0,
    // 頂点2(x, y, z)
    -1.0, -1.0, 0.0,
    // 頂点3(x, y, z)
    1.0, -1.0, 0.0,
  ];

  // 頂点色
  var color = [
    // 頂点0(r, g, b, a)
    1.0, 1.0, 1.0, 1.0,
    // 頂点1(r, g, b, a)
    1.0, 1.0, 1.0, 1.0,
    // 頂点2(r, g, b, a)
    1.0, 1.0, 1.0, 1.0,
    // 頂点3(r, g, b, a)
    1.0, 1.0, 1.0, 1.0,
  ];

  // テクスチャ座標
  var textureCoord = [
    // 頂点0(u, v)
    0.0, 0.0,
    // 頂点1(u, v)
    1.0, 0.0,
    // 頂点2(u, v)
    0.0, 1.0,
    // 頂点3(u, v)
    1.0, 1.0,
  ];

  // 頂点インデックス
  var index = [
    // ポリゴン0(a, b, c)
    0, 1, 2,
    // ポリゴン1(a, b, c)
    3, 2, 1,
  ];

  // VBOとIBOの生成
  var vPosition = create_vbo(position);
  var vColor = create_vbo(color);
  var vTextureCoord = create_vbo(textureCoord);
  var VBOList = [vPosition, vColor, vTextureCoord];
  var iIndex = create_ibo(index);

  // VBOとIBOの登録
  set_attribute(VBOList, attLocation, attStride);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);

  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, "mvpMatrix");
  uniLocation[1] = gl.getUniformLocation(prg, "texture0");
  uniLocation[2] = gl.getUniformLocation(prg, "texture1");

  /*-- 
  座標変換行列の生成と通知
   --*/

  // minMatrix.js を用いた行列関連処理
  // matIVオブジェクトを生成
  var m = new matIV();

  // 各種行列の生成と初期化
  // createメソッドは必ず4×4の正方行列(サイズ16の1次元配列)を生成
  var mMatrix = m.identity(m.create()); // モデル変換行列
  var vMatrix = m.identity(m.create()); // ビュー変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション変換行列
  var tmpMatrix = m.identity(m.create()); // 一時保存用の行列
  var mvpMatrix = m.identity(m.create()); // 最終座標変換行列

  // ビュー×プロジェクション座標変換行列
  // カメラの位置は、原点に 、後ろに 12.0
  m.lookAt([0.0, 0.0, 12.0], [0, 0, 0], [0, 1, 0], vMatrix);
  // 視野角を 45 度、アスペクト比は canvas のサイズ
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  // あらかじめ二つの行列を掛け合わせ保持しておく
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // テクスチャ用変数の宣言と生成
  var texture0 = null,
    texture1 = null;
  create_texture("texture0.png", 0);
  create_texture("texture1.png", 1);

  // カウンタの宣言
  var count = 0;

  // 恒常ループ
  (function () {
    // canvasを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // テクスチャユニットを指定してバインドし登録する
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(uniLocation[1], 0);

    // テクスチャユニットを指定してバインドし登録する
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(uniLocation[2], 1);

    // テクスチャにパラメータを設定し、自作したrender関数に移動ベクトルを渡して描画
    // 第一引数に対象となるテクスチャの種類を示す定数
    // 第二引数に指定するテクスチャパラメータの種類を表す定数と、その機能に付随するオプションを第三引数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([-6.25, 2.0, 0.0]);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([-3.75, 2.0, 0.0]);

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.NEAREST_MIPMAP_NEAREST
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([-1.25, 2.0, 0.0]);

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.NEAREST_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([1.25, 2.0, 0.0]);

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_NEAREST
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([3.75, 2.0, 0.0]);

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([6.25, 2.0, 0.0]);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    render([-2.5, -2.0, 0.0]);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    render([0.0, -2.0, 0.0]);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    render([2.5, -2.0, 0.0]);

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    setTimeout(arguments.callee, 1000 / 30);

    function render(trans) {
      // モデル座標変換行列の生成
      // 単位行列に変更
      m.identity(mMatrix);
      // 掛け合わせる行列・移動距離を指定して並進変換する
      m.translate(mMatrix, trans, mMatrix);
      // 参照する行列・回転角度・回転軸・演算結果を指定して行列を回転変換する
      m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
      // 行列乗算の右項・左項・演算結果を指定して行列を掛け算する
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);

      // uniform変数の登録
      gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
      // モデルの描画
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    }
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

  // テクスチャを生成する関数
  function create_texture(source, number) {
    // イメージオブジェクトの生成
    var img = new Image();

    // texImage2Dメソッドの呼び出しには、既に画像の読み込みが完了していなければならないので
    // データのオンロードをトリガーにする
    img.onload = function () {
      // テクスチャオブジェクトの生成
      var tex = gl.createTexture();

      // テクスチャをバインドする
      // 二次元画像フォーマットの利用を許可する定数"TEXTURE_2D"
      // バインドするテクスチャオブジェクトを指定
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // バインドしたテクスチャオブジェクトに画像データを適用
      // 二次元画像フォーマットの利用を許可する定数"TEXTURE_2D"
      // ミップマップのレベルを指定
      // カラーコンポーネントを指定(第三引数と同じ形式のテクセルデータ形式を第四引数に指定)
      // チャネルの容量(特別な画像でなければ各色8ビットのチャネルを扱う"UNSIGNED_BYTE"を使用)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // ミップマップを生成
      // 近くにあるオブジェクトには高解像度で、遠くにあるオブジェクトには低解像度でテクスチャを描画
      gl.generateMipmap(gl.TEXTURE_2D);

      // テクスチャの紐付け設定が終わったので、テクスチャのバインドを無効化
      gl.bindTexture(gl.TEXTURE_2D, null);

      // イベント全般戻り値を返すことができないため、生成したテクスチャをグローバル変数に代入
      switch (number) {
        case 0:
          texture0 = tex;
          break;
        case 1:
          texture1 = tex;
          break;
        default:
          break;
      }
    };

    // イメージオブジェクトのソースを指定
    img.src = source;
  }
};
