import { api } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import type {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  DEFAULT_TRANSFORMERS,
  MarkdownShortcutPlugin,
} from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { Toolbar } from "~/app/_lib/editor/components/Toolbar";
import { useSharedHistoryContext } from "../contexts/SharedHistoryContext";
import ImagesPlugin from "./ImagePlugin";
import { ImageNode } from "./image-node";
import { DragDropPastePlugin } from "./DragDropPastePlugin";

const theme = {
  root: "h-full p-4 border-border border-2 rounded-md overflow-y-auto",
  heading: {
    h1: "text-2xl font-bold",
    h2: "text-xl font-semibold",
    h3: "text-lg font-medium",
    h4: "text-lg font-normal",
    h5: "text-lg",
    h6: "text-lg",
  },
  list: {
    nested: {
      listitem: "list-none",
    },
    ol: "[list-style-type:revert] pl-[0.9rem]",
    ul: "[list-style-type:revert] pl-[0.9rem]",
    listitem: "editor-listItem",
    listitemChecked: "editor-listItemChecked",
    listitemUnchecked: "editor-listItemUnchecked",
  },
  quote: "border-l-4 border-gray-400 pl-2 text-gray-400",
  image: "editor-image",
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
    nodes: [
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
      HeadingNode,
      QuoteNode,
      HorizontalRuleNode,
      ImageNode,
    ],
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

  const { historyState } = useSharedHistoryContext();

  return (
    <div className="editor-shell flex h-full min-h-0 flex-col">
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />
        <div className="relative h-full min-h-0">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="ContentEditable__root" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-5 top-4">
                Enter some text...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin externalHistoryState={historyState} />
          <OnChangePlugin ignoreSelectionChange={true} onChange={handleSave} />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={DEFAULT_TRANSFORMERS} />
          <TabIndentationPlugin />
          <AutoFocusPlugin />
          <ImagesPlugin />
          <DragDropPastePlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}
