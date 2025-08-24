import { type ProtectedContext } from "~/server/trpc";
import { insertImageMetadata } from "../service";
import { type SaveImageMetadataInput } from "../schema";

export async function saveImageMetadataHandler(
  ctx: ProtectedContext,
  input: SaveImageMetadataInput,
): Promise<null> {
  await insertImageMetadata({
    db: ctx.db,
    userId: ctx.session.user.id,
    entryId: input.entryId,
    key: input.key,
  });
  return null;
}
