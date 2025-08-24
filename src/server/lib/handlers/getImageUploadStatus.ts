import { type ProtectedContext } from "~/server/trpc";
import { getImageUploadStatus } from "../service";
import { type GetImageUploadStatusInput } from "../schema";

export async function getImageUploadStatusHandler(
  ctx: ProtectedContext,
  input: GetImageUploadStatusInput,
): Promise<"uploaded" | "pending" | false> {
  if (!input.key) {
    return false;
  }
  const status = await getImageUploadStatus({ db: ctx.db, key: input.key });
  return status;
}
