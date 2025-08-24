import { type ProtectedContext } from "~/server/trpc";

export async function confirmImageUploadHandler(
  ctx: ProtectedContext,
  input: { key: string },
): Promise<void> {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  //
  // confirmImageUpload({ db: ctx.db, key: input.key });
}
