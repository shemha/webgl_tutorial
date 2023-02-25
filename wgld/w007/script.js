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
};
