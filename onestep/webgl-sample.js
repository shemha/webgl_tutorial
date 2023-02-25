//メイン処理
function main() {
  // htmlからcanvas要素を取得
  const canvas = document.querySelector("#glCanvas");
  // canvas要素からWebGLコンテキストを取得
  const gl = canvas.getContext("webgl");

  // WebGLが使用可能で動作している場合にのみ続行します(おそらく非対応環境用)
  if (gl === null) {
    alert(
      "WebGL を初期化できません。ブラウザーまたはマシンがサポートしていない可能性があります。"
    );
    return;
  }

  const vsSource = `
  attribute vec4 aVertexPosition;  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
  `;

  const fsSource = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
  `;

  // initShaderProgramで生成したシェーダープログラムで変数を初期化
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // シェーダープログラムを生成する
  function initShaderProgram(gl, vsSource, fsSource) {
    // loadShaderでコンパイルした各シェーダーで変数を初期化
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // 空のオブジェクトをシェーダープログラムとして作成する
    const shaderProgram = gl.createProgram();

    // シェーダープログラムにコンパイル済みのシェーダーを加える
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    // シェーダープログラム内のそれぞれのシェーダーを関連付ける
    gl.linkProgram(shaderProgram);

    // シェーダープログラムの作成に失敗した場合
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }
    // 正常に作成できたシェーダープログラムを返す
    return shaderProgram;
  }

  // シェーダーをコンパイルする
  function loadShader(gl, type, source) {
    // typeに応じたシェーダーを作成
    const shader = gl.createShader(type);

    // シェーダーにsourceを設定
    gl.shaderSource(shader, source);

    // シェーダーをコンパイルする
    gl.compileShader(shader);

    // コンパイルに失敗していた場合
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }

    // 正常にコンパイルされたシェーダーを返す
    return shader;
  }

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
  };

  const buffers = initBuffers(gl);

  function initBuffers(gl) {
    // 新しいバッファを作成
    const positionBuffer = gl.createBuffer();

    // バインドしてバッファの種類を指定
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // 頂点座標の定義
    const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];

    // バッファに座標データを渡す
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
      // 設定を終えたバッファを返す
      position: positionBuffer,
    };
  }

  drawScene(gl, programInfo, buffers);

  // シーンのレンダリング
  function drawScene(gl, programInfo, buffers) {
    // 深度関連設定ナシ！
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // gl.clearDepth(1.0);
    // gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 垂直方向の視野角
    const fieldOfView = (90 * Math.PI) / 180;
    // 縦横比
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    // 視錐台の近平面
    const zNear = 0.1;
    // 視錐台の遠平面
    const zFar = 100.0;

    // 投影行列の作成
    const projectionMatrix = mat4.create();

    // 透視投影行列の作成します。
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    let width = gl.canvas.clientWidth;
    let height = gl.canvas.clientHeight;
    let fov = 180;

    // 平行投影行列の作成
    // mat4.ortho(projectionMatrix,
    //           -width/fov,
    //           width/fov,
    //           -height/fov,
    //           height/fov,
    //           -100,
    //           100);

    // モデルビュー行列の作成
    const modelViewMatrix = mat4.create();

    // モデルビュー行列を操作してcanvasからの視点を調整
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);
    // mat4.rotate(modelViewMatrix,
    //                modelViewMatrix,
    //                45 * Math.PI / 180,
    //                [0, 1, 0]);

    // アトリビュートとVBOを紐付けする
    {
      // 頂点毎の値の数
      const numComponents = 2;
      // バッファに保存されているデータ型を指定
      const type = gl.FLOAT;
      // 正規化の有無を指定
      const normalize = false;
      // 0の場合、要素が順番に保存されていることを示す
      const stride = 0;
      // 値を読み取り始めるバッファ内の位置
      const offset = 0;
      // WebGLBufferにデータ(gl.ARRAY_BUFFER)を結合、関連付ける
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      // アトリビュートとVBOの紐付け
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      // アトリビュートの有効化
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // 描画時に使用するシェーダープログラム指定
    gl.useProgram(programInfo.program);

    // ユニフォームとprojectionMatrixを紐づけ
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    // ユニフォームとmodelViewMatrixを紐づけ
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    // ビューポート座標適用
    // gl.viewport(0,0,gl.canvas.width/2,gl.canvas.height/2);

    {
      // 配列内の開始要素を指定
      const offset = 0;
      // 描画される頂点の数
      const vertexCount = 4;
      // レンダリングモードを指定して位置情報をもとに描画する
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
  }
}

//ウインドウ読み込み後、関数実行
window.onload = main;
