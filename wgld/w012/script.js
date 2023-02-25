onload = function () {
  // canvas 要素の参照
  var c = document.getElementById("canvas");
  // canvas のサイズを定義
  c.width = 500;
  c.height = 300;

  // WebGL コンテキストを取得
  var gl = c.getContext("webgl");

  // 画面を完全な黒で初期化
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // 画面をクリア(初期化)する
  gl.clear(gl.COLOR_BUFFER_BIT);

  // モデル(頂点)データを格納する配列
  // 1, 4, 7はX座標を、2, 5, 8はY座標を、3, 6, 9はZ座標を表す
  var vertex_position = [
    // X,   Y,   Z
    0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];

  // シェーダを生成してコンパイルする関数
  function create_shader(id) {
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は離脱
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
      // 失敗していたらエラーログを警告
      alert(gl.getShaderInfoLog(shader));
    }
  }

  function create_program(vs, fs) {
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトに各シェーダを割り当てる
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
      // 失敗していたらエラーログを警告
      alert(gl.getProgramInfoLog(program));
    }
  }

  // VBO (頂点バッファ)を生成する関数
  function create_vbo(data) {
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();

    // バッファを紐付ける
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // 紐付けたバッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
  }
};
