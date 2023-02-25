(function () {
  "use strict";

  // variables
  var gl, run, canvas, canvasWidth, canvasHeight, camera;
  canvasWidth = 512;
  canvasHeight = 512;

  window.addEventListener(
    "load",
    function () {
      var e = document.getElementById("info");

      // canvas initialize
      canvas = document.getElementById("canvas");
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

      init();

      function init(texture) {
        // first shader(vs_first and fs_first)
        var vs = create_shader("vs_first");
        var fs = create_shader("fs_first");
        var prg = create_program(vs, fs);

        // get uniform block index and binding
        var blockIndexVS = gl.getUniformBlockIndex(prg, "matrix");
        var blockIndexFS = gl.getUniformBlockIndex(prg, "material");
        gl.uniformBlockBinding(prg, blockIndexVS, 0);
        gl.uniformBlockBinding(prg, blockIndexFS, 1);
        var scaleUniLocation = gl.getUniformLocation(prg, "scale");

        // second shader(vs_second and fs_second)
        vs = create_shader("vs_second");
        fs = create_shader("fs_second");
        var sPrg = create_program(vs, fs);

        // get uniform block index and binding
        var sBlockIndexVS = gl.getUniformBlockIndex(sPrg, "matrix");
        var sBlockIndexFS = gl.getUniformBlockIndex(sPrg, "material");
        gl.uniformBlockBinding(sPrg, sBlockIndexVS, 0);
        gl.uniformBlockBinding(sPrg, sBlockIndexFS, 1);
        var sScaleUniLocation = gl.getUniformLocation(sPrg, "scale");

        // attribute location
        var attLocation = [0];
        var attStride = [3];

        // post shader(vsp and fsp)
        vs = create_shader("vsp");
        fs = create_shader("fsp");
        var pPrg = create_program(vs, fs);
        var pAttLocation = [0];
        var pAttStride = [3];
        var pUniLocation = [];
        pUniLocation[0] = gl.getUniformLocation(pPrg, "texture2dSampler");

        // vertices
        var planePosition = [
          1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0,
        ];
        var planeIndex = [0, 1, 2, 2, 1, 3];

        // vertex array object
        var planeVAO = create_vao(
          [planePosition],
          pAttLocation,
          pAttStride,
          planeIndex
        );

        // sphere
        var sphereData = sphere(32, 32, 1.0);
        var sphereVAO = create_vao(
          [sphereData.p],
          attLocation,
          attStride,
          sphereData.i
        );

        // torus
        var torusData = torus(32, 32, 0.25, 0.75);
        var torusVAO = create_vao(
          [torusData.p],
          attLocation,
          attStride,
          torusData.i
        );

        // matrix
        var mat = new matIV();
        var mMatrix = mat.identity(mat.create());
        var vMatrix = mat.identity(mat.create());
        var pMatrix = mat.identity(mat.create());
        var vpMatrix = mat.identity(mat.create());
        var mvpMatrix = mat.identity(mat.create());

        // model
        mat.rotate(mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], mMatrix);

        // view and projection
        camera.update();
        mat.lookAt(
          camera.cameraPosition,
          camera.centerPoint,
          camera.cameraUpDirection,
          vMatrix
        );
        mat.perspective(
          60,
          canvasWidth / 2 / canvasHeight,
          0.1,
          camera.cameraDistance * 5.0,
          pMatrix
        );
        mat.multiply(pMatrix, vMatrix, vpMatrix);
        mat.multiply(vpMatrix, mMatrix, mvpMatrix);

        // uniform buffer object
        var matrixUBO = gl.createBuffer();
        var materialUBO = gl.createBuffer();

        // setup uniform buffer object
        gl.bindBuffer(gl.UNIFORM_BUFFER, matrixUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, mvpMatrix, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        var baseColor = new Float32Array([1.0, 0.6, 0.1, 1.0]);
        gl.bindBuffer(gl.UNIFORM_BUFFER, materialUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, baseColor, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        // binding ubo
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUBO);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, materialUBO);

        // flags
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);

        // framebuffer
        var bufferSize = 1024;
        var fBuffer = create_framebuffer(bufferSize, bufferSize);

        // textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fBuffer.texture);

        // setting
        run = false;
        render();

        function render() {
          // render to framebuffer --------------------------------------
          gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.framebuffer);
          gl.clearColor(0.3, 0.3, 0.3, 1.0);
          gl.clearDepth(1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          // clear left rect
          gl.useProgram(prg);
          gl.viewport(0, 0, bufferSize / 2, bufferSize);

          // vertex array object
          gl.uniform1f(scaleUniLocation, 0.9);
          gl.bindVertexArray(sphereVAO);
          gl.drawElements(
            gl.TRIANGLES,
            sphereData.i.length,
            gl.UNSIGNED_SHORT,
            0
          );

          // clear right rect
          gl.useProgram(sPrg);
          gl.viewport(bufferSize / 2, 0, bufferSize / 2, bufferSize);

          // vertex array object
          gl.uniform1f(sScaleUniLocation, 1.1);
          gl.bindVertexArray(torusVAO);
          gl.drawElements(
            gl.TRIANGLES,
            torusData.i.length,
            gl.UNSIGNED_SHORT,
            0
          );

          // render to canvas -------------------------------------------
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);

          // clear
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clearDepth(1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.viewport(0, 0, canvasWidth, canvasHeight);

          // program
          gl.useProgram(pPrg);

          // vertex array object
          gl.bindVertexArray(planeVAO);

          // push and render
          gl.uniform1i(pUniLocation[0], 0);
          gl.drawElements(
            gl.TRIANGLES,
            planeIndex.length,
            gl.UNSIGNED_SHORT,
            0
          );

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

  function create_vao(vboDataArray, attL, attS, iboData) {
    var vao, vbo, ibo, i;
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (i in vboDataArray) {
      vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vboDataArray[i]),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(attL[i]);
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
    if (iboData) {
      ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Int16Array(iboData),
        gl.STATIC_DRAW
      );
    }
    gl.bindVertexArray(null);
    return vao;
  }

  function create_framebuffer(width, height) {
    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    var depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      width,
      height
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthRenderBuffer
    );
    var fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      fTexture,
      0
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return {
      framebuffer: frameBuffer,
      renderbuffer: depthRenderBuffer,
      texture: fTexture,
    };
  }

  function create_texture(source, callback) {
    if (!callback) {
      return;
    }
    var img = new Image();
    img.onload = function () {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.bindTexture(gl.TEXTURE_2D, null);
      callback(tex);
    };
    img.src = source;
  }

  function create_cube_texture(source, target, callback) {
    if (!callback) {
      return;
    }
    var cImg = [];
    for (var i = 0; i < source.length; i++) {
      cImg[i] = new cubeMapImage();
      cImg[i].data.src = source[i];
    }
    function cubeMapImage() {
      this.data = new Image();
      this.data.onload = function () {
        this.imageDataLoaded = true;
        checkLoaded();
      };
    }
    function checkLoaded() {
      if (
        cImg[0].data.imageDataLoaded &&
        cImg[1].data.imageDataLoaded &&
        cImg[2].data.imageDataLoaded &&
        cImg[3].data.imageDataLoaded &&
        cImg[4].data.imageDataLoaded &&
        cImg[5].data.imageDataLoaded
      ) {
        generateCubeMap();
      }
    }
    function generateCubeMap() {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      for (var j = 0; j < source.length; j++) {
        gl.texImage2D(
          target[j],
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          cImg[j].data
        );
      }
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
        gl.TEXTURE_CUBE_MAP,
        gl.TEXTURE_WRAP_S,
        gl.CLAMP_TO_EDGE
      );
      gl.texParameteri(
        gl.TEXTURE_CUBE_MAP,
        gl.TEXTURE_WRAP_T,
        gl.CLAMP_TO_EDGE
      );
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
      callback(tex);
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
