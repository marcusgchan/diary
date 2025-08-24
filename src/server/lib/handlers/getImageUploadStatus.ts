import { type ProtectedContext } from "~/server/trpc";
import { getImageUploadStatus } from "../service";

export async function getImageUploadStatusHandler(
  ctx: ProtectedContext,
  input: { key?: string | undefined },
): Promise<"uploaded" | "pending" | false> {
  if (!input.key) {
    return false;
  }
  const status = await getImageUploadStatus({ db: ctx.db, key: input.key });
  return status;
}
