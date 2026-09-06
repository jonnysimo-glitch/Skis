/**
 * The terrain surface, on the GPU.
 *
 * Everything else about the map stays in Canvas 2D — the piste network, the
 * route, the labels, the markers, the gestures. This is only the ground they
 * are drawn on, and it is here because Canvas 2D cannot draw a photograph onto
 * a height field.
 *
 * What 2D can do is fill a quad with one colour, so the drape was sampled once
 * per quad and then, when that was visibly blocky, once per subdivided cell.
 * Either way the picture is the photograph downsampled to a grid of flat
 * patches: at the framing the app opens on the patch is about five pixels and
 * it looks like a photograph, and by zoom eight it is twenty and it looks like
 * a mosaic of paint chips. Measured alternatives, per triangle: a clipped
 * transformed drawImage is 30µs, which is 250ms a frame at this mesh density.
 * The GPU draws half a million textured triangles in under a millisecond, with
 * perspective-correct interpolation and mipmapped filtering, which is not a
 * speed-up so much as a different thing entirely.
 *
 * Three rules this file lives by:
 *
 *   1. The camera comes from `glMatrix`, which is derived from `toUnit` and
 *      checked against it. Anything drawn on top in 2D has to land on the
 *      ground it belongs to, and "close enough" is a map that is subtly wrong.
 *
 *   2. The colour maths matches `photoColour` and `surfaceColour` in
 *      FallbackTerrain.jsx. Two renderers that disagree about what snow looks
 *      like is worse than either of them alone.
 *
 *   3. It returns null rather than throwing when WebGL is not there. The 2D
 *      path is a complete renderer and stays the fallback.
 */
import { GRID, SKIRT_LIT, SKIRT_SHADE, BASE_COLOUR } from "./field.js";

const VERTEX = `
attribute vec3 pos;
attribute vec2 uv;
attribute vec2 light;   // x: hillshade 0..1, y: cast shadow 0..1
attribute vec2 face;    // x: 0 terrain, 1 slab, y: how far down the slab face
uniform mat4 mvp;
varying vec2 vUv;
varying vec2 vLight;
varying vec2 vFace;
varying float vW;
void main() {
  vUv = uv;
  vLight = light;
  vFace = face;
  gl_Position = mvp * vec4(pos, 1.0);
  vW = gl_Position.w;
}
`;

/*
 * The same arithmetic as photoColour and surfaceColour, in one pass.
 *
 * `skin` chooses between them rather than two programs, because the drape can
 * be missing over part of the mesh — the mosaic covers the field but a tile
 * that failed leaves a hole — and a per-pixel choice handles that where a
 * per-draw one cannot.
 */
const FRAGMENT = `
precision highp float;
uniform sampler2D tex;
uniform float skin;        // 1 with a drape, 0 for the drawn surface
uniform float sunShadows;  // 1 with the sun's cast shadows on, 0 without
uniform vec3 snow;
uniform vec3 sky;          // what haze fades toward
uniform vec3 skirtLit;
uniform vec3 skirtShade;
uniform vec3 base;
uniform vec2 depthRange;   // near, span, for the haze
varying vec2 vUv;
varying vec2 vLight;
varying vec2 vFace;
varying float vW;

const vec3 SUNLIT = vec3(1.05, 1.02, 0.96);
const vec3 SHADOW = vec3(0.78, 0.87, 1.06);

void main() {
  float shade = vLight.x;
  float shadow = vLight.y * sunShadows;
  vec3 c;
  if (vFace.x > 0.5) {
    /*
     * The block. Bedding planes down the face, from the same multipliers the
     * 2D renderer uses, so the two agree about what rock looks like. Sampled
     * as a smooth curve rather than the ten stops, which is what a gradient
     * with those stops comes out as anyway.
     */
    float t = clamp(vFace.y, 0.0, 1.0);
    float band =
      1.07 - 0.35 * t
      + 0.055 * sin(t * 19.0)
      + 0.035 * sin(t * 41.0 + 1.3);
    c = mix(skirtLit, skirtShade, step(1.5, vFace.x)) * band;
    // The floor of the block, which is one flat tone.
    if (vFace.x > 2.5) c = base;
    gl_FragColor = vec4(c / 255.0, 1.0);
    return;
  }

  if (skin > 0.5) {
    /*
     * Off the edge of the mosaic is snow, not the edge pixel.
     *
     * The texture is clamped, so a coordinate outside it samples the border
     * and keeps sampling it — which is a colour, and a wrong one. When the map
     * is handed a mosaic of somewhere else, every coordinate is outside and
     * the whole mountain comes out as one flat tone: reported as "the terrain
     * is all green", which is what the edge of a valley tile looks like. The
     * 2D renderer never had this because its sampler answers null out there
     * and falls through; this is the same answer, made explicit.
     */
    bool on = vUv.x >= 0.0 && vUv.x <= 1.0 && vUv.y >= 0.0 && vUv.y <= 1.0;
    vec4 t = texture2D(tex, vUv);
    // A texel the mosaic never covered comes back transparent; fall through to
    // the drawn surface rather than to a hole.
    bool photo = on && t.a > 0.5;
    c = photo ? t.rgb * 255.0 : snow;
    float k = photo ? 0.72 + 0.46 * shade : 0.52 + 0.80 * shade;
    c *= k * mix(SHADOW, SUNLIT, clamp(shade * 1.15, 0.0, 1.0));
  } else {
    c = snow * (0.52 + 0.80 * shade)
      * mix(SHADOW, SUNLIT, clamp(shade * 1.15, 0.0, 1.0));
  }

  // Ground the sun cannot reach: darker, and bluer as well as darker.
  c = mix(c, c * vec3(0.60, 0.69, 0.87), shadow);
  // A touch of aerial perspective, the same 0.16 the 2D renderer uses.
  float haze = clamp((vW - depthRange.x) / max(depthRange.y, 1.0), 0.0, 1.0);
  c = mix(c, sky, haze * 0.16);
  gl_FragColor = vec4(c / 255.0, 1.0);
}
`;

/** Depth, written to the red channel, for the occlusion test the 2D code does. */
const DEPTH_FRAGMENT = `
precision highp float;
uniform vec2 depthRange;
varying float vW;
void main() {
  gl_FragColor = vec4(clamp((vW - depthRange.x) / max(depthRange.y, 1.0), 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || "shader");
  }
  return s;
}

function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || "program");
  }
  return p;
}

/**
 * Per-vertex shading, averaged from the quads around it.
 *
 * The 2D renderer shades per quad, so the surface is faceted and needs a blur
 * over it to read as ground. A vertex attribute is interpolated across the
 * triangle for free, which is the same thing the blur was faking and exact
 * rather than smeared. This is the one place the GPU version deliberately
 * looks different from the 2D one, and it looks different by being right.
 */
function perVertex(quadValues, grid) {
  const n = grid + 1;
  const out = new Float32Array(n * n);
  for (let i = 0; i <= grid; i++) {
    for (let j = 0; j <= grid; j++) {
      let sum = 0;
      let seen = 0;
      for (const [di, dj] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
        const qi = i + di;
        const qj = j + dj;
        if (qi < 0 || qj < 0 || qi >= grid || qj >= grid) continue;
        sum += quadValues[qi * grid + qj];
        seen++;
      }
      out[i * n + j] = seen ? sum / seen : 0;
    }
  }
  return out;
}

/**
 * A terrain renderer, or null if this browser will not give us a context.
 *
 * The canvas is its own, not the app's: the result is composited into the 2D
 * canvas with one drawImage, which keeps every overlay, the blur, the pan
 * cache and the margin exactly as they were.
 */
export function createTerrainGL() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl", { antialias: true, alpha: true, depth: true }) ||
    canvas.getContext("experimental-webgl", { antialias: true, alpha: true, depth: true });
  if (!gl) return null;

  let program;
  let depthProgram;
  try {
    program = link(gl, VERTEX, FRAGMENT);
    depthProgram = link(gl, VERTEX, DEPTH_FRAGMENT);
  } catch {
    return null;
  }

  const buffers = {
    pos: gl.createBuffer(),
    uv: gl.createBuffer(),
    light: gl.createBuffer(),
    face: gl.createBuffer(),
    index: gl.createBuffer(),
  };
  let indexCount = 0;
  let indexType = gl.UNSIGNED_SHORT;
  const texture = gl.createTexture();
  let hasTexture = false;
  let builtFor = null;
  let depthFbo = null;
  let depthTex = null;
  let depthBuf = null;
  let depthSize = { width: 0, height: 0 };

  const bind = (prog) => {
    for (const [name, buf, size] of [
      ["pos", buffers.pos, 3],
      ["uv", buffers.uv, 2],
      ["light", buffers.light, 2],
      ["face", buffers.face, 2],
    ]) {
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
  };

  return {
    canvas,

    resize(width, height) {
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
    },

    /**
     * Build the mesh for a field. Once per resort, not per frame.
     *
     * `uvFor` turns a world position into a texture coordinate; null leaves
     * the surface undraped. `slab` adds the block's rim and floor.
     */
    setField(field, { uvFor = null, slab = null } = {}) {
      const key = `${field.minX},${field.maxX},${field.minZ},${field.maxZ},${field.lo},${!!uvFor},${slab ? slab.base : "none"}`;
      if (builtFor === key) return;
      builtFor = key;

      const n = GRID + 1;
      const { heights, at, minX, maxX, minZ, maxZ, shades, shadows, qAt } = field;
      const dx = (maxX - minX) / GRID;
      const dz = (maxZ - minZ) / GRID;

      // The quad-indexed shading, spread onto vertices so it interpolates.
      const quadShade = new Float32Array(GRID * GRID);
      const quadShadow = new Float32Array(GRID * GRID);
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          quadShade[i * GRID + j] = shades[qAt(i, j)];
          quadShadow[i * GRID + j] = shadows ? shadows[qAt(i, j)] : 0;
        }
      }
      const vShade = perVertex(quadShade, GRID);
      const vShadow = perVertex(quadShadow, GRID);

      const rimRows = slab ? 2 : 0;
      const rimVerts = slab ? (GRID + 1) * 2 * 4 : 0;
      const floorVerts = slab ? 4 : 0;
      const total = n * n + rimVerts + floorVerts;
      const pos = new Float32Array(total * 3);
      const uv = new Float32Array(total * 2);
      const light = new Float32Array(total * 2);
      const face = new Float32Array(total * 2);

      for (let i = 0; i <= GRID; i++) {
        const x = minX + dx * i;
        for (let j = 0; j <= GRID; j++) {
          const k = i * n + j;
          const z = minZ + dz * j;
          const y = heights[at(i, j)];
          pos[k * 3] = x;
          pos[k * 3 + 1] = y;
          pos[k * 3 + 2] = z;
          if (uvFor) {
            const t = uvFor(x, z);
            uv[k * 2] = t.u;
            uv[k * 2 + 1] = t.v;
          }
          light[k * 2] = vShade[k];
          light[k * 2 + 1] = vShadow[k];
        }
      }

      const idx = [];
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const a = i * n + j;
          const b = (i + 1) * n + j;
          const c = (i + 1) * n + j + 1;
          const d = i * n + j + 1;
          idx.push(a, b, c, a, c, d);
        }
      }

      if (slab) {
        const { base } = slab;
        let v = n * n;
        // Four rims, each a strip of quads from the ground down to the base.
        // `kind` is 1 for a face the sun is on and 2 for one it is not, which
        // is the same lit/shade split the 2D renderer makes by direction.
        const rim = (fromI, fromJ, di, dj, count, kind) => {
          const first = v;
          for (let s = 0; s <= count; s++) {
            const i = fromI + di * s;
            const j = fromJ + dj * s;
            const x = minX + dx * i;
            const z = minZ + dz * j;
            const y = heights[at(i, j)];
            for (const [yy, down] of [[y, 0], [base, 1]]) {
              pos[v * 3] = x;
              pos[v * 3 + 1] = yy;
              pos[v * 3 + 2] = z;
              face[v * 2] = kind;
              face[v * 2 + 1] = down;
              v++;
            }
          }
          for (let s = 0; s < count; s++) {
            const a = first + s * 2;
            idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
          }
        };
        rim(0, 0, 1, 0, GRID, 1);
        rim(0, GRID, 1, 0, GRID, 1);
        rim(0, 0, 0, 1, GRID, 2);
        rim(GRID, 0, 0, 1, GRID, 2);
        // The underside, one flat tone, so it is a box and not a shell.
        const floor = v;
        for (const [x, z] of [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]]) {
          pos[v * 3] = x;
          pos[v * 3 + 1] = base;
          pos[v * 3 + 2] = z;
          face[v * 2] = 3;
          v++;
        }
        idx.push(floor, floor + 1, floor + 2, floor, floor + 2, floor + 3);
      }

      const big = total > 65535;
      const uints = big && gl.getExtension("OES_element_index_uint");
      indexType = big && uints ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      const indices = indexType === gl.UNSIGNED_INT
        ? new Uint32Array(idx)
        : new Uint16Array(idx);
      indexCount = idx.length;

      const upload = (buf, data) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      };
      upload(buffers.pos, pos);
      upload(buffers.uv, uv);
      upload(buffers.light, light);
      upload(buffers.face, face);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      // The mesh changed, so whatever was draped on it is for another mountain.
      hasTexture = false;
      return { vertices: total, triangles: indexCount / 3, rimRows };
    },

    /** Hand the mosaic to the GPU. `image` is a canvas, bitmap or null. */
    setTexture(image) {
      if (!image) { hasTexture = false; return; }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      } catch {
        hasTexture = false;
        return;
      }
      /*
       * Mipmaps, and the reason they matter more here than usual.
       *
       * A ski map is looked at from a long way up, where one screen pixel
       * covers many texels. Without mipmaps that is point sampling — the
       * shimmering, crawling aliasing that reads as the map being cheap. With
       * them the GPU averages, which is what "a photograph of the mountain"
       * has always meant.
       *
       * The mosaic is not a power of two, and WebGL 1 will not mipmap or
       * repeat those, so it is clamped and mipmapped only when it happens to
       * be. Falling back to LINEAR is still bilinear filtering, which is
       * already far past what the 2D renderer could do.
       */
      const pot = (v) => (v & (v - 1)) === 0;
      const canMip = pot(image.width) && pot(image.height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (canMip) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      hasTexture = true;
    },

    get textured() { return hasTexture; },

    /**
     * One frame. `matrix` comes from glMatrix; `depth` is [near, span] in the
     * same units toUnit reports, for the haze and the occlusion read-back.
     */
    draw({ matrix, depth, snow, sky, shadows = true }) {
      if (!indexCount) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      bind(program);
      gl.uniformMatrix4fv(gl.getUniformLocation(program, "mvp"), false, matrix);
      gl.uniform1f(gl.getUniformLocation(program, "skin"), hasTexture ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(program, "sunShadows"), shadows ? 1 : 0);
      gl.uniform3fv(gl.getUniformLocation(program, "snow"), snow);
      gl.uniform3fv(gl.getUniformLocation(program, "sky"), sky);
      gl.uniform3fv(gl.getUniformLocation(program, "skirtLit"), SKIRT_LIT);
      gl.uniform3fv(gl.getUniformLocation(program, "skirtShade"), SKIRT_SHADE);
      gl.uniform3fv(gl.getUniformLocation(program, "base"), BASE_COLOUR);
      gl.uniform2fv(gl.getUniformLocation(program, "depthRange"), depth);
      if (hasTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, "tex"), 0);
      }
      gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);
    },

    /**
     * The same mesh again, with depth in the red channel, read back small.
     *
     * The 2D renderer needs to know whether a point on the mountain is in
     * front of the ground or behind it, so a run on the far side of a ridge is
     * hidden by the ridge. It used to answer that with a second rasterisation
     * of every quad into an offscreen; this is the same picture from the same
     * mesh, and the shape it returns is the shape that code already reads.
     */
    depthImage(width, height, { matrix, depth }) {
      if (!indexCount || width < 1 || height < 1) return null;
      if (!depthFbo || depthSize.width !== width || depthSize.height !== height) {
        if (depthFbo) {
          gl.deleteFramebuffer(depthFbo);
          gl.deleteTexture(depthTex);
          gl.deleteRenderbuffer(depthBuf);
        }
        depthFbo = gl.createFramebuffer();
        depthTex = gl.createTexture();
        depthBuf = gl.createRenderbuffer();
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTex, 0);
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuf);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuf);
        depthSize = { width, height };
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, depthFbo);
      gl.viewport(0, 0, width, height);
      // Alpha zero is "sky" to the reader, so the clear has to be transparent.
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depthProgram);
      bind(depthProgram);
      gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram, "mvp"), false, matrix);
      gl.uniform2fv(gl.getUniformLocation(depthProgram, "depthRange"), depth);
      gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);
      const out = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // Flipped: GL reads bottom-up and every caller here thinks in canvas
      // coordinates, which run the other way.
      const flipped = new Uint8Array(out.length);
      const row = width * 4;
      for (let y = 0; y < height; y++) {
        flipped.set(out.subarray((height - 1 - y) * row, (height - y) * row), y * row);
      }
      return { width, height, data: flipped };
    },
  };
}
