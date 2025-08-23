import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { EditorStateDomainService } from "~/server/features/editor/service";
import { EntryDomainService } from "~/server/features/entries/service";
import { saveEditorStateSchema } from "./schema";

export const editorRouter = createTRPCRouter({
  saveEditorState: protectedProcedure
    .input(saveEditorStateSchema)
    .mutation(async ({ ctx, input }) => {
      const editorStateService = new EditorStateDomainService(ctx);
      await editorStateService.saveEditorState(input);

      const entryService = new EntryDomainService(ctx);
      return await entryService.getEntry(input.entryId);
    }),
});
