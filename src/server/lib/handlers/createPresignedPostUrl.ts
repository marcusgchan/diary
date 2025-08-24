import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { getPresignedPost } from "../integrations/s3Service";
import { randomUUID } from "crypto";
import { type CreatePresignedPostUrlInput } from "../schema";

export async function createPresignedPostUrlHandler(
  ctx: ProtectedContext,
  input: CreatePresignedPostUrlInput,
) {
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry does not exist",
    });
  }

  const uuid = randomUUID();
  const url = await getPresignedPost(
    ctx.session.user.id,
    input.diaryId,
    input.entryId,
    uuid,
    {
      name: input.imageMetadata.name,
      size: input.imageMetadata.size,
      type: input.imageMetadata.mimetype,
    },
  );

  return url;
}
