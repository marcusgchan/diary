import { getImageSignedUrl } from "../integrations/s3Service";

export async function getImageUrlHandler(input: string) {
  return await getImageSignedUrl(input);
}
