import { useEffect } from "react";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { api } from "~/trpc/client";
import {
  $createParagraphNode,
  $createTextNode,
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import { useParams } from "next/navigation";
import { $getRoot, $getSelection } from "lexical";

const theme = {
  root: "h-full p-4 border-white border-2 rounded-md",
};

function onError(error: Error) {
  console.error(error);
}

function initEditorState() {
  const EMPTY_CONTENT =
    '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
  return EMPTY_CONTENT;
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
  const saveEditorStateMutation = api.diary.saveEditorState.useMutation({});
  function handleSave(editorState: EditorState) {
    const diaryId = params.diaryId as string | undefined;
    const entryId = params.entryId as string | undefined;
    if (diaryId === undefined || entryId === undefined) {
      console.error("diaryId or entryId is undefined");
      return;
    }
    const editorStateJson = editorState.toJSON();
    saveEditorStateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      updateDate: new Date(),
      editorState: JSON.stringify(editorStateJson),
    });
    //}
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
