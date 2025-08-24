import { type ProtectedContext } from "~/server/trpc";

export async function cancelImageUploadHandler(
  ctx: ProtectedContext,
  input: { key: string },
): Promise<void> {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  // const s3Service = new S3ImageService(ctx);
  // await Promise.all([
  //   s3Service.deleteImage(input.key),
  //   cancelImageUpload({
  //     db: ctx.db,
  //     key: input.key,
  //   }),
  // ]);
}
