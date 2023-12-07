import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { api } from "~/trpc/client";
import {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import { useParams } from "next/navigation";

const theme = {
  root: "h-full p-4 border-white border-2 rounded-md",
};

function onError(error: Error) {
  console.error(error);
}

function initEditorState() {
  return null;
}

export function Editor({
  initialEditorState,
}: {
  initialEditorState: SerializedEditorState<SerializedLexicalNode> | null;
}) {
  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
    editorState: initialEditorState
      ? JSON.stringify(initialEditorState)
      : initEditorState(),
  };
  const params = useParams();
  const diaryId = params.diaryId as string | undefined;
  const entryId = params.entryId as string | undefined;
  const queryUtils = api.useContext();
  const saveEditorStateMutation = api.diary.saveEditorState.useMutation({
    onSuccess(data) {
      queryUtils.diary.getEntry.setData(
        { diaryId: Number(diaryId), entryId: Number(entryId) },
        data,
      );
    },
  });
  function handleSave(editorState: EditorState) {
    if (diaryId === undefined || entryId === undefined) {
      console.error("diaryId or entryId is undefined");
      return;
    }
    const editorStateJson = editorState.toJSON();
    if (editorStateJson.root.children.length === 0) {
      return;
    }
    saveEditorStateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      updateDate: new Date(),
      editorState: JSON.stringify(editorStateJson),
    });
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative h-full">
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={
            <div className="pointer-events-none absolute left-5 top-4">
              Enter some text...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin ignoreSelectionChange={true} onChange={handleSave} />
      </div>
    </LexicalComposer>
  );
}
