import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { EditorStateService } from "../repositories/editorState";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { type Span } from "@opentelemetry/api";
import {
  type CreateEntry,
  type GetEntriesInput,
  type GetEntryInput,
  type DeleteEntryInput,
  type GetEntryDayInput,
  type GetEntryTitleInput,
  type EditEntryDate,
  type UpdateEntryTitle,
  type SaveEditorState,
} from "../schema";

export async function createEntryHandler(
  ctx: ProtectedContext,
  input: CreateEntry,
) {
  const entryService = new EntryService(ctx);
  return await entryService.createEntry(input);
}

export async function getEntriesHandler(
  ctx: ProtectedContext,
  input: GetEntriesInput,
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntries(input.diaryId);
}

export async function getEntryHandler(
  ctx: ProtectedContext,
  input: GetEntryInput,
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}

export async function deleteEntryHandler(
  ctx: ProtectedContext,
  input: DeleteEntryInput,
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

export async function getEntryDayHandler(
  ctx: ProtectedContext,
  input: GetEntryDayInput,
): Promise<string> {
  const entryService = new EntryService(ctx);
  const [day] = await entryService.getEntryDay(input.entryId);

  if (day === undefined) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return day.day;
}

export async function getEntryTitleHandler(
  ctx: ProtectedContext,
  input: GetEntryTitleInput,
): Promise<string> {
  const entryService = new EntryService(ctx);
  const [title] = await entryService.getEntryTitle(input.entryId);

  if (title === undefined) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return title.title;
}

export async function updateEntryDateHandler(
  ctx: ProtectedContext,
  input: EditEntryDate,
): Promise<{ diaryId: number; entryId: number; day: string }> {
  const entryService = new EntryService(ctx);
  const id = await entryService.getEntryIdByDate(input);

  if (id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry with this date already exists",
    });
  }

  await entryService.updateEntryDate(input);
  return { diaryId: input.diaryId, entryId: input.entryId, day: input.day };
}

export async function updateTitleHandler(
  ctx: ProtectedContext,
  input: UpdateEntryTitle,
): Promise<string> {
  const entryService = new EntryService(ctx);
  await entryService.updateTitle(input);
  return input.title;
}

export async function saveEditorStateHandler(
  ctx: ProtectedContext,
  input: SaveEditorState,
) {
  const editorStateService = new EditorStateService(ctx);
  await editorStateService.saveEditorState(input);

  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
