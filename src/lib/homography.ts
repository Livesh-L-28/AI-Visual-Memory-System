import { RoomCalibrationPoint } from '../types';

/**
 * 2D Projective Homography transformation for camera pixels to floor map coordinate projection.
 * Implements Direct Linear Transformation (DLT) with Gaussian elimination.
 */

export interface Point2D {
  x: number;
  y: number;
}

// 3x3 matrix in row-major order:
// [h00, h01, h02,
//  h10, h11, h12,
//  h20, h21, h22]
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

/**
 * Solve an 8x8 linear system A * x = b using Gaussian elimination with partial pivoting.
 */
function solve8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot row
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(M[r][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }

    if (maxVal < 1e-9) {
      return null; // Singular matrix
    }

    // Swap pivot row
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate below and above
    const pivot = M[col][col];
    for (let c = col; c <= n; c++) {
      M[col][c] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = M[r][col];
        if (Math.abs(factor) > 1e-12) {
          for (let c = col; c <= n; c++) {
            M[r][c] -= factor * M[col][c];
          }
        }
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Compute true 3x3 Projective Homography matrix H from 4 calibration point pairs
 * using Direct Linear Transformation (DLT).
 * Maps normalized camera pixel (u, v) in [0..1] -> floor plan (x, y) in meters.
 */
export function computeHomography(pts: RoomCalibrationPoint[]): Matrix3x3 {
  if (!pts || pts.length < 4) {
    return [
      8.0, 0, 0,
      0, 6.0, 0,
      0, 0, 1.0
    ];
  }

  // Construct 8x8 system
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = pts[i].pxX;
    const v = pts[i].pxY;
    const x = pts[i].mapX;
    const y = pts[i].mapY;

    // Row 2i: u*h00 + v*h01 + h02 - u*x*h20 - v*x*h21 = x
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    // Row 2i+1: u*h10 + v*h11 + h12 - u*y*h20 - v*y*h21 = y
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const solution = solve8x8(A, b);

  if (!solution) {
    // Fallback: estimate scaling
    const minMapX = Math.min(...pts.map((p) => p.mapX));
    const maxMapX = Math.max(...pts.map((p) => p.mapX));
    const minMapY = Math.min(...pts.map((p) => p.mapY));
    const maxMapY = Math.max(...pts.map((p) => p.mapY));
    const scaleX = maxMapX - minMapX || 8.0;
    const scaleY = maxMapY - minMapY || 6.0;

    return [
      scaleX, 0, minMapX,
      0, scaleY, minMapY,
      0, 0, 1.0
    ];
  }

  return [
    solution[0], solution[1], solution[2],
    solution[3], solution[4], solution[5],
    solution[6], solution[7], 1.0
  ];
}

/**
 * Invert a 3x3 matrix to allow mapping floor map meters back to camera pixel coordinates.
 */
export function invertMatrix3x3(m: Matrix3x3): Matrix3x3 | null {
  const [
    m00, m01, m02,
    m10, m11, m12,
    m20, m21, m22
  ] = m;

  const det =
    m00 * (m11 * m22 - m12 * m21) -
    m01 * (m10 * m22 - m12 * m20) +
    m02 * (m10 * m21 - m11 * m20);

  if (Math.abs(det) < 1e-10) return null;

  const invDet = 1.0 / det;

  return [
    (m11 * m22 - m12 * m21) * invDet,
    (m02 * m21 - m01 * m22) * invDet,
    (m01 * m12 - m02 * m11) * invDet,
    (m12 * m20 - m10 * m22) * invDet,
    (m00 * m22 - m02 * m20) * invDet,
    (m02 * m10 - m00 * m12) * invDet,
    (m10 * m21 - m11 * m20) * invDet,
    (m01 * m20 - m00 * m21) * invDet,
    (m00 * m11 - m01 * m10) * invDet
  ];
}

/**
 * Projects a normalized pixel coordinate (pxX, pxY in 0..1) to room map meters (X, Y)
 * using true projective homography transformation.
 */
export function projectPixelToMap(
  pxX: number,
  pxY: number,
  calibrationPoints: RoomCalibrationPoint[],
  roomWidth: number = 8.0,
  roomHeight: number = 6.0,
  cachedMatrix?: Matrix3x3
): Point2D {
  const H = cachedMatrix || computeHomography(calibrationPoints);

  const u = Math.max(0, Math.min(1, pxX));
  const v = Math.max(0, Math.min(1, pxY));

  // Compute homogeneous coordinates
  const w = H[6] * u + H[7] * v + H[8];

  if (Math.abs(w) > 1e-6) {
    const rawX = (H[0] * u + H[1] * v + H[2]) / w;
    const rawY = (H[3] * u + H[4] * v + H[5]) / w;

    // Constrain within room bounds with safety margin
    const x = Math.max(0, Math.min(roomWidth, rawX));
    const y = Math.max(0, Math.min(roomHeight, rawY));

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  }

  // Fallback to proportional scale
  return {
    x: Number((u * roomWidth).toFixed(2)),
    y: Number((v * roomHeight).toFixed(2))
  };
}

/**
 * Reverse project floor map coordinates (X, Y in meters) to normalized camera pixels (u, v in 0..1).
 */
export function projectMapToPixel(
  mapX: number,
  mapY: number,
  calibrationPoints: RoomCalibrationPoint[],
  cachedMatrix?: Matrix3x3
): Point2D {
  const H = cachedMatrix || computeHomography(calibrationPoints);
  const Hinv = invertMatrix3x3(H);

  if (!Hinv) {
    return { x: 0.5, y: 0.5 };
  }

  const w = Hinv[6] * mapX + Hinv[7] * mapY + Hinv[8];
  if (Math.abs(w) > 1e-6) {
    const u = (Hinv[0] * mapX + Hinv[1] * mapY + Hinv[2]) / w;
    const v = (Hinv[3] * mapX + Hinv[4] * mapY + Hinv[5]) / w;
    return {
      x: Number(Math.max(0, Math.min(1, u)).toFixed(3)),
      y: Number(Math.max(0, Math.min(1, v)).toFixed(3))
    };
  }

  return { x: 0.5, y: 0.5 };
}
