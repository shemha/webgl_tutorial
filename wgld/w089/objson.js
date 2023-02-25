// ------------------------------------------------------------------------------------------------
// objson.js
// version 0.0.4
// Copyright (c) doxas
// ------------------------------------------------------------------------------------------------

var OBJSON = function () {};

OBJSON.prototype.objsonConvert = function (src, mtl, stringify) {
  var a, b, c, d, i, j, k, l, m, n;
  var rows;
  var source = src;
  var mtlSource = null;
  var mtlMode = null;
  var minmax = 0;
  var mat = 0;
  var material = [];
  material[0] = new this.objsonMtlData(); // default

  // generate material object
  if (mtl !== null && mtl !== undefined) {
    mtlSource = mtl;
    mtlSource = mtlSource.replace(/^#[\x20-\x7e]+\s$/gm, "");
    mtlSource = mtlSource.replace(/^g[\x20-\x7e]+\s$/gm, "");
    mtlSource = mtlSource.replace(/^g\s$/gm, "");
    mtlSource = mtlSource.replace(/\x20{2,}/gm, "\x20");
    mtlSource = mtlSource.replace(/^\s/gm, "");
    rows = mtlSource.match(/[\x20-\x7e]+\s/gm);

    for (i = 0, len = rows.length; i < len; i++) {
      switch (rows[i].substr(0, 2)) {
        case "ne":
          ++mat;
          material[mat] = new this.objsonMtlData();
          a = rows[i].match(/\S+/g);
          material[mat].name = a[a.length - 1];
          material[mat].src = "";
          break;
        case "d ":
          a = rows[i].match(/[\d|\.]+/g);
          material[mat].alpha = a[0] * 1.0;
          break;
        case "Ka":
          a = rows[i].match(/[\d|\.]+/g);
          material[mat].ambient = [a[0] * 1.0, a[1] * 1.0, a[2] * 1.0];
          break;
        case "Kd":
          a = rows[i].match(/[\d|\.]+/g);
          material[mat].diffuse = [a[0] * 1.0, a[1] * 1.0, a[2] * 1.0];
          break;
        case "Ks":
          a = rows[i].match(/[\d|\.]+/g);
          material[mat].specular = [a[0] * 1.0, a[1] * 1.0, a[2] * 1.0];
          break;
        case "Tf":
          a = rows[i].match(/[\d|\.]+/g);
          material[mat].texture = [a[0] * 1.0, a[1] * 1.0, a[2] * 1.0];
          break;
        case "il":
          a = rows[i].match(/[\d|\.]+/g);
          if (!isNaN(parseInt(a[a.length - 1]))) {
            if (parseInt(a[a.length - 1]) <= 2) {
              material[mat].mode = parseInt(a[a.length - 1]);
            }
          }
          break;
        case "Ns":
          a = rows[i].match(/[\d|\.]+/g);
          if (!isNaN(parseFloat(a[a.length - 1]))) {
            material[mat].sharpness = parseFloat(a[a.length - 1]);
          }
          break;
        default:
          if (rows[i].match(/map_Kd/)) {
            a = rows[i].match(/[\w|\.]+/g);
            material[mat].diffuseSource = a[a.length - 1];
          } else if (rows[i].match(/map_Ka/)) {
            a = rows[i].match(/[\w|\.]+/g);
            material[mat].ambientSource = a[a.length - 1];
          }
          break;
      }
    }
  }

  source = source.replace(/^#[\x20-\x7e]+\s$/gm, "");
  source = source.replace(/^g[\x20-\x7e]+\s$/gm, "");
  source = source.replace(/^g\s$/gm, "");
  source = source.replace(/\x20{2,}/gm, "\x20");
  source = source.replace(/^\s/gm, "");
  rows = source.match(/[\x20-\x7e]+\s/gm);
  var v = []; // vertex * 3
  var vn = []; // vertex * 3
  var vt = []; // vertex * 3
  var f = []; // face * 1
  var fmat = []; // face * 1
  for (i = 0, len = rows.length; i < len; i++) {
    switch (rows[i].substr(0, 2)) {
      case "v ":
        a = rows[i].match(/-?[\d\.]+(e(?=-)?|e(?=\+)?)?[-\+\d\.]*/g);
        v.push(a[0] * 1.0, a[1] * 1.0, a[2] * 1.0);
        minmax = Math.max(
          minmax,
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2])
        );
        break;
      case "vn":
        a = rows[i].match(/-?[\d\.]+(e(?=-)?|e(?=\+)?)?[-\+\d\.]*/g);
        vn.push(a[0] * 1.0, a[1] * 1.0, a[2] * 1.0);
        break;
      case "vt":
        a = rows[i].match(/-?[\d\.]+(e(?=-)?|e(?=\+)?)?[-\+\d\.]*/g);
        vt.push(a[0] * 1.0, a[1] * 1.0);
        break;
      case "f ":
        a = rows[i].match(/[\d\/]+/g);
        f.push([a[0], a[1], a[2]]);
        fmat.push(mtlMode);
        k = mtlMode != null ? mtlMode : 0;
        if (a.length > 3) {
          f.push([a[2], a[3], a[0]]);
          fmat.push(mtlMode);
        }
        break;
      case "us":
        a = rows[i].match(/\S+/g);
        mtlMode = null;
        for (j = 0; j < material.length; ++j) {
          if (material[j].name === a[a.length - 1]) {
            mtlMode = j;
            break;
          }
        }
        break;
      default:
        break;
    }
  }

  for (i = 0, j = f.length; i < j; ++i) {
    a = [];
    a[0] = f[i][0].split(/\//);
    a[1] = f[i][1].split(/\//);
    a[2] = f[i][2].split(/\//);
    d = fmat[i] != null ? fmat[i] : 0;
    for (n = 0; n < 3; ++n) {
      k = (a[n][0] - 1) * 3;
      switch (a[n].length) {
        case 1: // position only vertex
          material[d].position.push(v[k], v[k + 1], v[k + 2]);
          material[d].texCoord.push(0.0, 0.0);
          material[d].normal.push(0.0, 0.0, 0.0);
          break;
        case 2: // position and texCoord in vertex
          l = (a[n][1] - 1) * 2;
          material[d].position.push(v[k], v[k + 1], v[k + 2]);
          material[d].texCoord.push(vt[l], vt[l + 1]);
          material[d].normal.push(0.0, 0.0, 0.0);
          break;
        case 3: // position and normal and texCoord in vertex
          l = (a[n][1] - 1) * 2;
          m = (a[n][2] - 1) * 3;
          material[d].position.push(v[k], v[k + 1], v[k + 2]);
          material[d].texCoord.push(vt[l], vt[l + 1]);
          material[d].normal.push(vn[m], vn[m + 1], vn[m + 2]);
          break;
        default:
          console.warn("objson parse error: invalid face data");
          return;
      }
      if (n === 2) {
        if (a[0].length < 3) {
          b = [];
          b[0] = (a[0][0] - 1) * 3;
          b[1] = (a[1][0] - 1) * 3;
          b[2] = (a[2][0] - 1) * 3;
          c = this.faceNormal(
            [v[b[0]], v[b[0] + 1], v[b[0] + 2]],
            [v[b[1]], v[b[1] + 1], v[b[1] + 2]],
            [v[b[2]], v[b[2] + 1], v[b[2] + 2]]
          );
          b = material[d].normal.length - 9;
          material[d].normal[b] += c[0] * 1.0;
          material[d].normal[b + 1] += c[1] * 1.0;
          material[d].normal[b + 2] += c[2] * 1.0;
          material[d].normal[b + 3] += c[0] * 1.0;
          material[d].normal[b + 4] += c[1] * 1.0;
          material[d].normal[b + 5] += c[2] * 1.0;
          material[d].normal[b + 6] += c[0] * 1.0;
          material[d].normal[b + 7] += c[1] * 1.0;
          material[d].normal[b + 8] += c[2] * 1.0;
        }
      }
    }
  }
  if (vn.length === 0) {
    for (i = 0, j = material.length; i < j; ++i) {
      for (k = 0, l = material[i].normal.length; k < l; k += 3) {
        b = [
          material[i].normal[k],
          material[i].normal[k + 1],
          material[i].normal[k + 2],
        ];
        c = this.vec3Normalize(b);
        material[i].normal[k] = c[0];
        material[i].normal[k + 1] = c[1];
        material[i].normal[k + 2] = c[2];
      }
    }
  }

  if (stringify) {
    dest = "{";
    dest += '"face":' + f.length;
    dest += ',"vertex":' + f.length * 3;
    dest += ',"minmax":' + minmax;
    dest += ',"material":' + JSON.stringify(material);
    dest += "}";
  } else {
    dest = {};
    dest.face = f.length;
    dest.vertex = f.length * 3;
    dest.minmax = minmax;
    dest.data = material;
  }
  return dest;
};

OBJSON.prototype.objsonMtlData = function () {
  this.name = "";
  this.alpha = 1.0;
  this.ambient = [1.0, 1.0, 1.0];
  this.diffuse = [1.0, 1.0, 1.0];
  this.specular = [1.0, 1.0, 1.0];
  this.texture = [0.0, 0.0, 0.0];
  this.sharpness = 10.0; // range from 0 to 1000
  this.mode = 0; // 0: diffuse only, 1: diffuse and ambient, 2: 1 and specular on
  this.position = [];
  this.normal = [];
  this.texCoord = [];
  this.diffuseSource = "";
  this.ambientSource = "";
  this.diffuseUnit = 0;
  this.ambientUnit = 0;
};

OBJSON.prototype.vec3Normalize = function (v, d) {
  var e, dig;
  var n = [0.0, 0.0, 0.0];
  var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (l > 0) {
    if (!d) {
      dig = 5;
    } else {
      dig = d;
    }
    e = 1.0 / l;
    n[0] = (v[0] * e).toFixed(dig);
    n[1] = (v[1] * e).toFixed(dig);
    n[2] = (v[2] * e).toFixed(dig);
  }
  return n;
};

OBJSON.prototype.faceNormal = function (v0, v1, v2) {
  var n = [];
  var vec1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  var vec2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  n[0] = vec1[1] * vec2[2] - vec1[2] * vec2[1];
  n[1] = vec1[2] * vec2[0] - vec1[0] * vec2[2];
  n[2] = vec1[0] * vec2[1] - vec1[1] * vec2[0];
  return this.vec3Normalize(n);
};
