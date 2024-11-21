"use client";

import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COPY_COMMAND,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  LexicalCommand,
  LexicalEditor,
  PASTE_COMMAND,
  createCommand,
} from "lexical";
import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  ImagePayload,
} from "./image-node";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import { api } from "~/trpc/client";
import { useParams } from "next/navigation";
import { copyToClipboard, LexicalClipboardData, setLexicalClipboardDataTransfer } from "@lexical/clipboard"

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");

export default function ImagesPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    function pastHandler(e: ClipboardEvent) {
      const clipboardData = e.clipboardData;
      // const text = clipboardData?.getData('application/x-lexical-editor');
      const text = clipboardData?.getData('application/x-lexical-editor');
      if (!text) {
        return;
      }
      const t = JSON.parse(text);
      
      const str = JSON.stringify(t);
      // copyToClipboard(editor, e, {"text/plain":'', "application/x-lexical-editor": t});
     // copyToClipboard(editor, null, {"text/plain":'abc', "application/x-lexical-editor": "a"});
      // editor.dispatchCommand(COPY_COe.clipboardData?.itemsMMAND, e);
      // console.log(e.clipboardData?.items)
      setLexicalClipboardDataTransfer(e.clipboardData!, {"text/plain":'abc', "application/x-lexical-editor": JSON.stringify({"namespace":"MyEditor","nodes":[{"children":[{"imageKey":"e5c57c0c-705d-42ac-8558-679fc339076a/2/15/3907fd1f-0fe0-4a85-867b-e46f60a05a3d-apple","altText":"","caption":{"editorState":{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}},"height":200,"width":200,"maxHeight":200,"maxWidth":200,"showCaption":false,"src":"/api/image/e5c57c0c-705d-42ac-8558-679fc339076a/2/15/3907fd1f-0fe0-4a85-867b-e46f60a05a3d-apple","type":"image","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"as;kdlas;kdla","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}]})})
    }
    window.addEventListener("copy", pastHandler);

    return () => window.removeEventListener("copy", pastHandler);
  }, [editor]);

  // useEffect(() => {
  //   function pastHandler(e: ClipboardEvent) {
  //     e.stopImmediatePropagation()
  //     const clipboardData = e.clipboardData;
  //     // const text = clipboardData?.getData('application/x-lexical-editor');
  //     const text = clipboardData?.getData('application/x-lexical-editor');
  //     if (!text) {
  //       return;
  //     }
  //     console.log(text);
  //   }
  //   window.addEventListener("paste", pastHandler);
  //
  //   return () => window.removeEventListener("paste", pastHandler);
  // }, [editor]);

  // useEffect(() => {
  //   return editor.registerCommand<ClipboardEvent>(PASTE_COMMAND, (event,b) => {
  //     const clipboardData = event.clipboardData;
  //     const text = clipboardData?.getData('text/plain');
  //     console.log('plain text:', text);
  //     console.log('editor text:', clipboardData?.getData('application/x-lexical-editor'));
  //     setLexicalClipboardDataTransfer(event.clipboardData!, {"text/plain":'abc', "application/x-lexical-editor": JSON.stringify({"namespace":"MyEditor","nodes":[{"children":[{"imageKey":"e5c57c0c-705d-42ac-8558-679fc339076a/2/15/3907fd1f-0fe0-4a85-867b-e46f60a05a3d-apple","altText":"","caption":{"editorState":{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}},"height":200,"width":200,"maxHeight":200,"maxWidth":200,"showCaption":false,"src":"/api/image/e5c57c0c-705d-42ac-8558-679fc339076a/2/15/3907fd1f-0fe0-4a85-867b-e46f60a05a3d-apple","type":"image","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"as;kdlas;kdla","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}]})})
  //     return true;
  //   }, COMMAND_PRIORITY_HIGH);
  // },[editor]);
  //
  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error("ImagesPlugin: ImageNode not registered on editor");
    }

    return mergeRegister(
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [captionsEnabled, editor]);

  useRemoveImageMetadataOnDelete(editor);

  return null;
}

function useRemoveImageMetadataOnDelete(editor: LexicalEditor) {
  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);
  const queryUtils = api.useContext();
  const deleteImageMetadata = api.diary.deleteImageMetadata.useMutation({
    onSuccess(data) {
      if (!data) {
        return;
      }
      // queryUtils.diary.getEntry.setData({ diaryId, entryId }, data);
    },
  });
  useEffect(() => {
    const removeMutationListener = editor.registerMutationListener(
      ImageNode,
      (mutatedNodes, { updateTags, dirtyLeaves, prevEditorState }) => {
        // mutatedNodes is a Map where each key is the NodeKey, and the value is the state of mutation.
        for (let [nodeKey, mutation] of mutatedNodes) {
          if (mutation == "destroyed") {
            editor.read(() => {
              const node = prevEditorState._nodeMap.get(nodeKey) as ImageNode;
              if (node == null) {
                return;
              }
              deleteImageMetadata.mutate({ entryId, key: node.getImageKey() });
            });
          }
        }
      },
      { skipInitialization: false },
    );
    return removeMutationListener;
  });

  return null;
}

function getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

const TRANSPARENT_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const img = document.createElement("img");
img.src = TRANSPARENT_IMAGE;

function onDragStart(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData("text/plain", "_");
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    "application/x-lexical-drag",
    JSON.stringify({
      data: {
        altText: node.__altText,
        caption: node.__caption,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        showCaption: node.__showCaption,
        src: node.__src,
        width: node.__width,
      },
      type: "image",
    }),
  );

  return true;
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    target &&
    target instanceof HTMLElement &&
    !target.closest("code, span.editor-image") &&
    target.parentElement &&
    target.parentElement.closest("div.ContentEditable__root")
  );
}

function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
  }
  return true;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData("application/x-lexical-drag");
  if (!dragData) {
    return null;
  }
  const { type, data } = JSON.parse(dragData);
  if (type !== "image") {
    return null;
  }

  return data;
}

function onDragover(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

const CAN_USE_DOM: boolean =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined";

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const target = event.target as null | Element | Document;
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
        ? (target as Document).defaultView
        : (target as Element).ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
