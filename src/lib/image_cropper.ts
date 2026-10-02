import sharp from 'sharp';
export { DEFAULT_CLASS_THUMBNAILS, getDefaultThumbnailForClass } from './thumbnail_utils';

export async function cropBoundingBox(
  frameBase64: string,
  bbox: { x1: number; y1: number; x2: number; y2: number }
): Promise<string | null> {
  try {
    const cleanBase64 = frameBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) return null;

    const imgW = metadata.width;
    const imgH = metadata.height;

    // Add a 3% padding margin around the bounding box
    const pad = 0.03;
    const normX1 = Math.max(0, Math.min(0.99, bbox.x1 - pad));
    const normY1 = Math.max(0, Math.min(0.99, bbox.y1 - pad));
    const normX2 = Math.min(1.0, Math.max(normX1 + 0.02, bbox.x2 + pad));
    const normY2 = Math.min(1.0, Math.max(normY1 + 0.02, bbox.y2 + pad));

    const left = Math.round(normX1 * imgW);
    const top = Math.round(normY1 * imgH);
    const width = Math.max(16, Math.min(imgW - left, Math.round((normX2 - normX1) * imgW)));
    const height = Math.max(16, Math.min(imgH - top, Math.round((normY2 - normY1) * imgH)));

    const cropped = await sharp(buffer)
      .extract({ left, top, width, height })
      .resize(240, 240, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${cropped.toString('base64')}`;
  } catch (err) {
    console.warn('Error cropping bounding box:', err);
    return null;
  }
}
