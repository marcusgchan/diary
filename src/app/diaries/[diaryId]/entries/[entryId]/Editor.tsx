import { useEffect } from "react";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { api } from "~/trpc/client";
import { EditorState } from "lexical";
import { useParams } from "next/navigation";

const theme = {
  root: "h-full p-4 border-white border-2 rounded-md",
};

function onError(error: Error) {
  console.error(error);
}

export function Editor({ initialEditorState }: { initialEditorState: string }) {
  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
    editorState: JSON.stringify(initialEditorState),
  };
  const params = useParams();
  const saveEditorStateMutation = api.diary.saveEditorState.useMutation({});
  function handleSave(editorState: EditorState) {
    const diaryId = params.diaryId as string | undefined;
    const entryId = params.entryId as string | undefined;
    if (diaryId === undefined || entryId === undefined) {
      console.error("diaryId or entryId is undefined");
      return;
    }
    saveEditorStateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      updateDate: new Date(),
      editorState: JSON.stringify(editorState.toJSON()),
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
        <OnChangePlugin onChange={handleSave} />
      </div>
    </LexicalComposer>
  );
}
