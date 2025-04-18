export function getCompressedImageKey(key: string) {
  const indexOfDot = key.lastIndexOf(".");
  const nameWithoutExt = key.slice(0, indexOfDot);
  const compressedImageName = `${nameWithoutExt}-compressed.webp`;
  return compressedImageName;
}
