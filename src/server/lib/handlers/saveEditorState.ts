import { type ProtectedContext } from "~/server/trpc";
import { EditorStateService } from "../repositories/editorState";
import { EntryService } from "../repositories/entry";
import { type SaveEditorState } from "../schema";

export async function saveEditorStateHandler(
  ctx: ProtectedContext,
  input: SaveEditorState,
) {
  const editorStateService = new EditorStateService(ctx);
  await editorStateService.saveEditorState(input);

  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
