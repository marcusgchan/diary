import { type ProtectedContext } from "~/server/trpc";
import { EditorStateService } from "../repositories/editorState";
import { EntryService } from "../repositories/entry";
import { saveEditorStateSchema } from "../schema";

export async function saveEditorStateHandler(
  ctx: ProtectedContext,
  input: typeof saveEditorStateSchema._type,
) {
  const editorStateService = new EditorStateService(ctx);
  await editorStateService.saveEditorState(input);

  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
