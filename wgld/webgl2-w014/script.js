(function () {
  "use strict";

  // variables
  var gl, run, canvas, canvasWidth, canvasHeight, camera;
  var targetImageData, imageWidth, imageHeight;
  var mousePosition;
  canvasWidth = 512;
  canvasHeight = 512;
  imageWidth = 256;
  imageHeight = 256;

  window.addEventListener(
    "load",
    function () {
      var e = document.getElementById("info");

      // canvas initialize
      canvas = document.getElementById("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      mousePosition = [0.0, 0.0];

      // mousemove event
      canvas.addEventListener(
        "mousemove",
        function (eve) {
          var bound = eve.currentTarget.getBoundingClientRect();
          var x = eve.clientX - bound.left;
          var y = eve.clientY - bound.top;
          mousePosition = [
            (x / bound.width) * 2.0 - 1.0,
            -((y / bound.height) * 2.0 - 1.0),
          ];
        },
        false
      );

      // webgl2 initialize
      gl = canvas.getContext("webgl2");
      if (gl) {
        e.textContent = "ready";
      } else {
        e.textContent = "webgl2 unsupported";
        console.log("webgl2 unsupported");
        return;
      }

      // window keydown event
      window.addEventListener(
        "keydown",
        function (eve) {
          run = eve.keyCode !== 27;
        },
        false
      );

      // interaction camera events
      camera = new InteractionCamera(3.0);
      canvas.addEventListener("mousedown", camera.mouseInteractionStart, false);
      canvas.addEventListener("mousemove", camera.mouseInteractionMove, false);
      canvas.addEventListener("mouseup", camera.mouseInteractionEnd, false);
      canvas.addEventListener("wheel", camera.wheelScroll, false);

      // generate imagedata
      var img = new Image();
      img.addEventListener(
        "load",
        function () {
          var c = document.createElement("canvas");
          var ctx = c.getContext("2d");
          c.width = imageWidth;
          c.height = imageHeight;
          ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
          targetImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
          init();
        },
        false
      );
      img.src = "lenna.jpg";

      function init() {
        // transform feedback object
        var transformFeedback = gl.createTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

        // out variable names
        var outVaryings = ["gl_Position", "vColor"];

        // transform out shader
        var vs = create_shader("vs_transformOut");
        var fs = create_shader("fs_transformOut");
        var prg = create_program_tf_separate(vs, fs, outVaryings);
        var attLocation = [];
        attLocation[0] = 0;
        attLocation[1] = 1;
        var attStride = [];
        attStride[0] = 4;
        attStride[1] = 4;
        var uniLocation = [];
        uniLocation[0] = gl.getUniformLocation(prg, "time");
        uniLocation[1] = gl.getUniformLocation(prg, "mouse");

        // feedback in shader
        vs = create_shader("vs_feedbackIn");
        fs = create_shader("fs_feedbackIn");
        var fPrg = create_program(vs, fs);
        var fAttLocation = [];
        fAttLocation[0] = 0;
        fAttLocation[1] = 1;
        var fAttStride = [];
        fAttStride[0] = 4;
        fAttStride[1] = 4;
        var fUniLocation = [];
        fUniLocation[0] = gl.getUniformLocation(fPrg, "vpMatrix");

        // vertices
        var position = [];
        var color = [];
        var feedbackPosition = [];
        var feedbackColor = [];
        (function () {
          var i, j, k, l;
          var x, y;
          for (i = 0; i < imageHeight; ++i) {
            y = (i / imageHeight) * 2.0 - 1.0;
            k = i * imageWidth;
            for (j = 0; j < imageWidth; ++j) {
              x = (j / imageWidth) * 2.0 - 1.0;
              l = (k + j) * 4;
              position.push(x, -y, 0.0, 1.0);
              color.push(
                targetImageData.data[l] / 255,
                targetImageData.data[l + 1] / 255,
                targetImageData.data[l + 2] / 255,
                targetImageData.data[l + 3] / 255
              );
              feedbackPosition.push(0.0, 0.0, 0.0, 0.0);
              feedbackColor.push(0.0, 0.0, 0.0, 0.0);
            }
          }
        })();

        var transformOutVBO = [create_vbo(position), create_vbo(color)];
        var feedbackInVBO = [
          create_vbo_feedback(feedbackPosition),
          create_vbo_feedback(feedbackColor),
        ];

        // matrix
        var mat = new matIV();
        var vMatrix = mat.identity(mat.create());
        var pMatrix = mat.identity(mat.create());
        var vpMatrix = mat.identity(mat.create());

        // flags
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
        gl.disable(gl.RASTERIZER_DISCARD);

        // setting
        var startTime = Date.now();
        var nowTime = 0;
        run = true;
        render();

        function render() {
          nowTime = (Date.now() - startTime) / 1000;

          // camera update
          camera.update();
          mat.lookAt(
            camera.cameraPosition,
            camera.centerPoint,
            camera.cameraUpDirection,
            vMatrix
          );
          mat.perspective(
            60,
            canvasWidth / canvasHeight,
            0.1,
            camera.cameraDistance * 5.0,
            pMatrix
          );
          mat.multiply(pMatrix, vMatrix, vpMatrix);

          // program
          gl.useProgram(prg);

          // set vbo
          set_attribute(transformOutVBO, attLocation, attStride);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, feedbackInVBO[0]);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, feedbackInVBO[1]);

          // begin transform feedback
          gl.enable(gl.RASTERIZER_DISCARD);
          gl.beginTransformFeedback(gl.POINTS);

          // vertex transform
          gl.uniform1f(uniLocation[0], nowTime);
          gl.uniform2fv(uniLocation[1], mousePosition);
          gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

          // end transform feedback
          gl.disable(gl.RASTERIZER_DISCARD);
          gl.endTransformFeedback();
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);

          // clear
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clearDepth(1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.viewport(0, 0, canvasWidth, canvasHeight);

          // program
          gl.useProgram(fPrg);

          // set vbo
          set_attribute(feedbackInVBO, fAttLocation, fAttStride);

          // push and render
          gl.uniformMatrix4fv(fUniLocation[0], false, vpMatrix);
          gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

          gl.flush();

          // animation loop
          if (run) {
            requestAnimationFrame(render);
          }
        }
      }
    },
    false
  );

  // utility functions ======================================================
  function create_shader(id) {
    var shader;
    var scriptElement = document.getElementById(id);
    scriptElement.innerHTML = scriptElement.innerHTML.replace("\n      ", "");
    if (!scriptElement) {
      return;
    }
    switch (scriptElement.type) {
      case "x-shader/x-vertex":
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
      case "x-shader/x-fragment":
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }
    gl.shaderSource(shader, scriptElement.text);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    } else {
      alert(gl.getShaderInfoLog(shader));
    }
  }

  function create_program(vs, fs) {
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);
      return program;
    } else {
      alert(gl.getProgramInfoLog(program));
    }
  }

  function create_program_tf_separate(vs, fs, varyings) {
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);
      return program;
    } else {
      alert(gl.getProgramInfoLog(program));
    }
  }

  function create_vbo(data) {
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  function create_vbo_feedback(data) {
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  function set_attribute(vbo, attL, attS) {
    for (var i in vbo) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
      gl.enableVertexAttribArray(attL[i]);
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
  }

  function set_attribute_base(vbo) {
    for (var i in vbo) {
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, vbo[i]);
    }
  }

  // interaction camera class ===============================================
  function InteractionCamera(defaultDistance) {
    var distance = 10.0;
    if (defaultDistance && !isNaN(parseFloat(defaultDistance))) {
      distance = defaultDistance;
    }
    this.cameraDistance = distance;
    this.dCameraDistance = this.cameraDistance;
    this.cameraPosition = [0.0, 0.0, this.cameraDistance];
    this.centerPoint = [0.0, 0.0, 0.0];
    this.cameraUpDirection = [0.0, 1.0, 0.0];
    this.dCameraPosition = [0.0, 0.0, this.cameraDistance];
    this.dCenterPoint = [0.0, 0.0, 0.0];
    this.dCameraUpDirection = [0.0, 1.0, 0.0];
    this.cameraRotateX = 0.0;
    this.cameraRotateY = 0.0;
    this.cameraScale = 0.0;
    this.clickStart = false;
    this.prevPosition = [0, 0];
    this.offsetPosition = [0, 0];
    this.qtn = new qtnIV();
    this.qt = this.qtn.identity(this.qtn.create());
    this.qtx = this.qtn.identity(this.qtn.create());
    this.qty = this.qtn.identity(this.qtn.create());

    this.mouseInteractionStart = function (eve) {
      this.clickStart = true;
      this.prevPosition = [eve.pageX, eve.pageY];
      eve.preventDefault();
    };
    this.mouseInteractionMove = function (eve) {
      if (!this.clickStart) {
        return;
      }
      var w = canvasWidth;
      var h = canvasHeight;
      var s = 1.0 / Math.min(w, h);
      this.offsetPosition = [
        eve.pageX - this.prevPosition[0],
        eve.pageY - this.prevPosition[1],
      ];
      this.prevPosition = [eve.pageX, eve.pageY];
      switch (eve.buttons) {
        case 1:
          this.cameraRotateX += this.offsetPosition[0] * s;
          this.cameraRotateY += this.offsetPosition[1] * s;
          this.cameraRotateX = this.cameraRotateX % 1.0;
          this.cameraRotateY = Math.min(
            Math.max(this.cameraRotateY % 1.0, -0.25),
            0.25
          );
          break;
      }
    };
    this.mouseInteractionEnd = function (eve) {
      this.clickStart = false;
    };
    this.wheelScroll = function (eve) {
      var w = eve.wheelDelta;
      if (w > 0) {
        this.cameraScale = 0.8;
      } else if (w < 0) {
        this.cameraScale = -0.8;
      }
    };
    this.update = function () {
      var PI2 = Math.PI * 2.0;
      var v = [1.0, 0.0, 0.0];
      this.cameraScale *= 0.75;
      this.cameraDistance += this.cameraScale;
      this.cameraDistance = Math.min(
        Math.max(this.cameraDistance, this.dCameraDistance * 0.1),
        this.dCameraDistance * 2.0
      );
      this.dCameraPosition[2] = this.cameraDistance;
      this.qtn.identity(this.qt);
      this.qtn.identity(this.qtx);
      this.qtn.identity(this.qty);
      this.qtn.rotate(this.cameraRotateX * PI2, [0.0, 1.0, 0.0], this.qtx);
      this.qtn.toVecIII(v, this.qtx, v);
      this.qtn.rotate(this.cameraRotateY * PI2, v, this.qty);
      this.qtn.multiply(this.qtx, this.qty, this.qt);
      this.qtn.toVecIII(this.dCameraPosition, this.qt, this.cameraPosition);
      this.qtn.toVecIII(
        this.dCameraUpDirection,
        this.qt,
        this.cameraUpDirection
      );
    };
    this.mouseInteractionStart = this.mouseInteractionStart.bind(this);
    this.mouseInteractionMove = this.mouseInteractionMove.bind(this);
    this.mouseInteractionEnd = this.mouseInteractionEnd.bind(this);
    this.wheelScroll = this.wheelScroll.bind(this);
    this.update = this.update.bind(this);
  }
})();
