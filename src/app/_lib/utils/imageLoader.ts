import { getClosestSize } from "./getCompressedImageKey";

/**
 * Custom loader for Next.js Image component
 * Routes images through your authenticated /api/image route
 * Uses pre-generated optimized sizes for fast delivery
 *
 * @param src - The image key (e.g., "userId/diaryId/entryId/filename.jpg")
 * @param width - Target width - will be rounded to closest pre-generated size
 * @returns URL to the image API route with width param
 */
export function customImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // If src is already a full URL, return it as-is
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Round to closest pre-generated size
  const optimizedWidth = getClosestSize(width);
  const baseUrl = src.startsWith("/api/image/") ? src : `/api/image/${src}`;
  return `${baseUrl}?w=${optimizedWidth}`;
}
