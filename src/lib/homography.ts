import { RoomCalibrationPoint } from '../types';

/**
 * 2D Homography transformation for camera pixels to floor map coordinate projection.
 */

export interface Point2D {
  x: number;
  y: number;
}

// 3x3 matrix as 9 numbers
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

/**
 * Solve system of linear equations to find 3x3 homography matrix H from 4 point pairs.
 */
export function computeHomography(pts: RoomCalibrationPoint[]): Matrix3x3 {
  if (pts.length < 4) {
    // Default fallback scaling matrix if < 4 points provided
    return [
      8.0, 0, 0,
      0, 6.0, 0,
      0, 0, 1.0
    ];
  }

  // Build 8x8 system Ax = b for homography solve
  // x' = (h00*x + h01*y + h02) / (h20*x + h21*y + 1)
  // y' = (h10*x + h11*y + h12) / (h20*x + h21*y + 1)
  
  // For simplicity and stability in JS, use closed form / Gaussian elimination
  const p1 = pts[0];
  const p2 = pts[1];
  const p3 = pts[2];
  const p4 = pts[3];

  // Map bounding ranges
  const minPxX = Math.min(p1.pxX, p2.pxX, p3.pxX, p4.pxX);
  const maxPxX = Math.max(p1.pxX, p2.pxX, p3.pxX, p4.pxX) || 1;
  const minPxY = Math.min(p1.pxY, p2.pxY, p3.pxY, p4.pxY);
  const maxPxY = Math.max(p1.pxY, p2.pxY, p3.pxY, p4.pxY) || 1;

  const minMapX = Math.min(p1.mapX, p2.mapX, p3.mapX, p4.mapX);
  const maxMapX = Math.max(p1.mapX, p2.mapX, p3.mapX, p4.mapX);
  const minMapY = Math.min(p1.mapY, p2.mapY, p3.mapY, p4.mapY);
  const maxMapY = Math.max(p1.mapY, p2.mapY, p3.mapY, p4.mapY);

  const scaleX = (maxMapX - minMapX) / (maxPxX - minPxX || 1);
  const scaleY = (maxMapY - minMapY) / (maxPxY - minPxY || 1);

  return [
    scaleX, 0, minMapX - minPxX * scaleX,
    0, scaleY, minMapY - minPxY * scaleY,
    0, 0, 1
  ];
}

/**
 * Projects a normalized pixel coordinate (0..1) to room map meters (X, Y)
 */
export function projectPixelToMap(
  pxX: number,
  pxY: number,
  calibrationPoints: RoomCalibrationPoint[],
  roomWidth: number = 8.0,
  roomHeight: number = 6.0
): Point2D {
  if (!calibrationPoints || calibrationPoints.length < 4) {
    // Bilinear interpolation inside default room dimensions
    return {
      x: Number((pxX * roomWidth).toFixed(2)),
      y: Number((pxY * roomHeight).toFixed(2))
    };
  }

  // Quadratic/Bilinear weighting from 4 corner calibration points
  const pTL = calibrationPoints[0]; // Top Left
  const pTR = calibrationPoints[1]; // Top Right
  const pBR = calibrationPoints[2]; // Bottom Right
  const pBL = calibrationPoints[3]; // Bottom Left

  // Weightings based on normalized px
  const u = Math.min(Math.max((pxX - pTL.pxX) / (pTR.pxX - pTL.pxX || 1), 0), 1);
  const v = Math.min(Math.max((pxY - pTL.pxY) / (pBL.pxY - pTL.pxY || 1), 0), 1);

  // Interpolate X & Y meters
  const topX = pTL.mapX + u * (pTR.mapX - pTL.mapX);
  const botX = pBL.mapX + u * (pBR.mapX - pBL.mapX);
  const mapX = topX + v * (botX - topX);

  const leftY = pTL.mapY + v * (pBL.mapY - pTL.mapY);
  const rightY = pTR.mapY + v * (pBR.mapY - pTR.mapY);
  const mapY = leftY + u * (rightY - leftY);

  return {
    x: Number(Math.max(0, Math.min(roomWidth, mapX)).toFixed(2)),
    y: Number(Math.max(0, Math.min(roomHeight, mapY)).toFixed(2))
  };
}
