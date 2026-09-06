/**
 * The camera, as a 4x4 the GPU can use.
 *
 * The terrain is drawn by WebGL and everything on top of it — the piste
 * network, the route, the labels, the markers — is still drawn in Canvas 2D
 * with `toUnit` and `project`. So these two have to be the same camera to the
 * pixel. They are not "close enough": a label half a pixel off its junction is
 * visible, and a route line drifting from the ground it is drawn on is the
 * whole map being wrong.
 *
 * Rather than reimplement the projection, this derives the matrix from it.
 * `toUnit` is
 *
 *   px = x - cx,  py = (y - cy) * V,  pz = z - cz
 *   rx =  px cos b - pz sin b
 *   rz =  px sin b + pz cos b
 *   sy = -rz cos p - py sin p
 *   d  =  rz sin p - py cos p
 *   w  =  span * 1.45 + d
 *   u  =  rx / w,  v = sy / w
 *
 * and `project` is `ox + u f`, `oy + v f`. Every one of rx, sy, d and w is
 * affine in (x, y, z), so the whole thing is a perspective matrix with w as
 * the divide — exactly what clip space is. Nothing is approximated here; the
 * unit test asserts the two agree to a thousandth of a pixel.
 *
 * Column-major, because that is what `uniformMatrix4fv` wants.
 */
import { VERT_EXAGGERATION } from "./field.js";

/** How near the near plane sits, as a fraction of the perspective constant. */
const NEAR_FRAC = 0.02;

/**
 * @param field  the height field, for its centre and span
 * @param view   bearing and pitch in degrees
 * @param cam    the focal length and screen offsets `fit` solved
 * @param width  canvas width in the same pixels `project` returns
 * @param height canvas height
 */
export function glMatrix(field, view, cam, width, height) {
  const b = (view.bearing * Math.PI) / 180;
  const p = (view.pitch * Math.PI) / 180;
  const sb = Math.sin(b);
  const cb = Math.cos(b);
  const sp = Math.sin(p);
  const cp = Math.cos(p);
  const V = VERT_EXAGGERATION;
  const { cx, cy, cz, span } = field;
  const K = span * 1.45;

  // Each of these is [coefficient of x, of y, of z, constant].
  const w = [
    sp * sb,
    -cp * V,
    sp * cb,
    K - sp * sb * cx + cp * V * cy - sp * cb * cz,
  ];
  const rx = [cb, 0, -sb, -cb * cx + sb * cz];
  const sy = [
    -cp * sb,
    -sp * V,
    -cp * cb,
    cp * sb * cx + sp * V * cy + cp * cb * cz,
  ];

  // Pixels to normalised device coordinates. GL's y points up, the canvas's
  // points down, which is the sign on D.
  const A = (2 * cam.ox) / width - 1;
  const B = (2 * cam.f) / width;
  const C = 1 - (2 * cam.oy) / height;
  const D = (-2 * cam.f) / height;

  const X = [0, 1, 2, 3].map((i) => A * w[i] + B * rx[i]);
  const Y = [0, 1, 2, 3].map((i) => C * w[i] + D * sy[i]);
  /*
   * Depth, as 1 - 2n/w.
   *
   * Not the scene's own depth range, which would have to be measured every
   * frame and would make the matrix depend on what is in it. w is
   * span * 1.45 + depth and the projection is only valid while it is
   * positive — the camera is never inside the mountain — so w is a monotonic
   * stand-in for depth, and the standard reversed mapping gives -1 at the near
   * plane and approaches 1 far away.
   */
  const near = K * NEAR_FRAC;
  const Z = [w[0], w[1], w[2], w[3] - 2 * near];

  // Column-major: consecutive fours are columns, so this is the transpose of
  // how the rows read above.
  return new Float32Array([
    X[0], Y[0], Z[0], w[0],
    X[1], Y[1], Z[1], w[1],
    X[2], Y[2], Z[2], w[2],
    X[3], Y[3], Z[3], w[3],
  ]);
}

/** Where `glMatrix` puts a world point, in canvas pixels. For the test. */
export function applyMatrix(m, x, y, z, width, height) {
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return {
    x: ((cx / cw + 1) / 2) * width,
    y: ((1 - cy / cw) / 2) * height,
    w: cw,
  };
}
