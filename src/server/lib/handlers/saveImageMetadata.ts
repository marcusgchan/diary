import { type ProtectedContext } from "~/server/trpc";
import { insertImageMetadata } from "../service";

export async function saveImageMetadataHandler(
  ctx: ProtectedContext,
  input: { key: string; entryId: number },
): Promise<null> {
  await insertImageMetadata({
    db: ctx.db,
    userId: ctx.session.user.id,
    entryId: input.entryId,
    key: input.key,
  });
  return null;
}
