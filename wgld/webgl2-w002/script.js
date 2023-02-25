(function () {
  // "use strict";

  // variables
  var gl, canvas, canvasWidth, canvasHeight;

  window.addEventListener(
    "load",
    function () {
      var e = document.getElementById("info");

      // canvas initialize
      canvas = document.getElementById("canvas");
      canvasWidth = 512;
      canvasHeight = 512;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // webgl2 initialize
      gl = canvas.getContext("webgl2");
      if (gl) {
        e.textContent = "ready";
      } else {
        e.textContent = "webgl2 unsupported";
        console.log("webgl2 unsupported");
        return;
      }

      // clear buffer
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    false
  );
})();
