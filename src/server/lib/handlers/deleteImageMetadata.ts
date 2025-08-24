import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type DeleteImageMetadataInput } from "../schema";

export async function deleteImageMetadataHandler(
  ctx: ProtectedContext,
  input: DeleteImageMetadataInput,
) {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  //
  // const s3Service = new S3ImageService(ctx);
  // await Promise.all([
  //   s3Service.deleteImage(input.key),
  //   deleteImageMetadata({
  //     db: ctx.db,
  //     key: input.key,
  //   }),
  // ]);

  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
