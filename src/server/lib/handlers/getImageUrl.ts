import { getImageSignedUrl } from "../integrations/s3Service";
import { type GetImageUrlInput } from "../schema";

export async function getImageUrlHandler(input: GetImageUrlInput) {
  return await getImageSignedUrl(input);
}
