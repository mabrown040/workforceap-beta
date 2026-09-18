import { PROFILE_PHOTO_OUTPUT_SIZE } from '@/lib/portal/memberProfilePhoto';

/**
 * Center-crop an image file to a square WebP blob for profile photos.
 * `scale` > 1 zooms in (smaller crop window); 1 = largest centered square.
 */
export async function cropProfilePhotoToSquare(
  file: File,
  scale = 1,
  outputSize = PROFILE_PHOTO_OUTPUT_SIZE,
): Promise<Blob> {
  const safeScale = Math.max(1, Math.min(scale, 3));
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const minDim = Math.min(image.width, image.height);
    const cropSize = minDim / safeScale;
    const sx = Math.max(0, (image.width - cropSize) / 2);
    const sy = Math.max(0, (image.height - cropSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare photo preview');

    ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/webp', 0.9);
    });
    if (!blob) throw new Error('Could not process photo');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = src;
  });
}
