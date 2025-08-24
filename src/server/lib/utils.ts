export function getUserIdFromKey(key: string) {
  // 1024 is max s3 key length
  if (key.length > 1024) {
    return null;
  }

  const firstSlash = key.indexOf("/");
  if (firstSlash === -1) {
    return null;
  }

  const userId = key.slice(0, firstSlash);
  return userId;
}
