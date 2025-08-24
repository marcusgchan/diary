import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { getUnlinkedImages } from "../service";
import { getImageSignedUrl } from "../integrations/s3Service";
import { type GetMultipleImageUploadStatusInput } from "../schema";

export async function getMultipleImageUploadStatusHandler(
  ctx: ProtectedContext,
  input: GetMultipleImageUploadStatusInput,
) {
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  console.log({
    keys: input.keys,
    diaryId: input.diaryId,
    entryId: input.entryId,
  });

  const unlinked = await getUnlinkedImages({
    db: ctx.db,
    keys: input.keys,
    entryId: input.entryId,
  });
  console.log({ unlinked });

  const unlinkedTransformed = unlinked
    .filter((el) => input.keyToIdMap.get(el.key) !== undefined)
    .map(async (el) => {
      try {
        const url = await getImageSignedUrl(el.key);
        const id = input.keyToIdMap.get(el.key);
        if (id === undefined) {
          throw new Error();
        }

        if (el.compressionStatus === "failure") {
          return [
            id,
            { type: "compression_failure", key: el.key, url },
          ] as const;
        }

        return [id, { type: "success", key: el.key, url }] as const;
      } catch (_) {
        return [
          input.keyToIdMap.get(el.key)!,
          {
            type: "error",
          },
        ] as const;
      }
    });

  const res = await Promise.all(unlinkedTransformed);
  const resultMap = new Map<
    string,
    | { type: "success"; key: string; url: string }
    | { type: "compression_failure"; key: string; url: string }
    | { type: "error" }
  >();

  for (const [key, value] of res) {
    resultMap.set(key, value);
  }

  return resultMap;
}
