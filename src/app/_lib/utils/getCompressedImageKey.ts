// Pre-defined sizes for optimized images
export const IMAGE_SIZES = [96, 256, 640, 1080] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export function getCompressedImageKey(key: string) {
  const indexOfDot = key.lastIndexOf(".");
  const nameWithoutExt = key.slice(0, indexOfDot);
  const compressedImageName = `${nameWithoutExt}-compressed.webp`;
  return compressedImageName;
}

export function getOptimizedImageKey(key: string, width: number): string {
  const indexOfDot = key.lastIndexOf(".");
  const nameWithoutExt = key.slice(0, indexOfDot);
  return `${nameWithoutExt}-${width}w.webp`;
}

export function getClosestSize(requestedWidth: number): number {
  // Find the smallest size that's >= requested width, or the largest if none match
  for (const size of IMAGE_SIZES) {
    if (size >= requestedWidth) {
      return size;
    }
  }
  // Return largest size as fallback (1080)
  return 1080;
}
