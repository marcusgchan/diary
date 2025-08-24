import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { type Span } from "@opentelemetry/api";

export async function deleteEntryHandler(
  ctx: ProtectedContext,
  input: { diaryId: number; entryId: number },
): Promise<number> {
  return ctx.tracer.startActiveSpan(
    "deleteEntryProcedure",
    async (span: Span) => {
      const entryService = new EntryService(ctx);

      // Check if entry exists
      const entry = await entryService.getEntryIdById(input.entryId);
      if (!entry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry does not exist",
        });
      }

      // Delete the entry
      const [err] = await tryCatch(entryService.deleteEntry(input.entryId));
      if (err) {
        ctx.log(
          "deleteEntry",
          "warn",
          "unable to delete entry from database: " + err.message,
        );
      }

      span.end();
      return input.entryId;
    },
  );
}
