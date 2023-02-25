#version 300 es

in vec3 vertexPosition;
in vec4 color;

layout(std140) uniform Matrices {
    mat4 model;
    mat4 view;
    mat4 projection;
};

out vec4 vColor;

void main() {
  vColor = color;
  gl_Position = projection * view * model * vec4(vertexPosition, 1.0);
}