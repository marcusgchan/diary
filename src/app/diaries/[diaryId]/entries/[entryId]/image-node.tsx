import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import { $applyNodeReplacement, createEditor, DecoratorNode } from "lexical";
import * as React from "react";
import { type JSX } from "react";

import ImageComponent from "./ImageComponent";

export interface ImagePayload {
  altText: string;
  caption?: LexicalEditor;
  height?: number | "100%";
  width?: number | "100%";
  maxHeight?: number;
  key?: NodeKey;
  maxWidth?: number;
  showCaption?: boolean;
  src: string;
  imageKey: string;
  captionsEnabled?: boolean;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, width, height } = domNode;
    const node = $createImageNode({
      altText,
      height,
      src,
      width,
      imageKey: "",
    });
    return { node };
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: SerializedEditor;
    height: number | "100%";
    width: number | "100%";
    maxWidth: number;
    maxHeight: number;
    showCaption: boolean;
    src: string;
    imageKey: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: "100%" | number;
  __height: "100%" | number;
  __maxWidth: number;
  __maxHeight: number;
  __showCaption: boolean;
  __caption: LexicalEditor;
  // Captions cannot yet be used within editor cells
  __captionsEnabled: boolean;
  __imageKey: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__imageKey,
      node.__altText,
      node.__width,
      node.__height,
      node.__maxWidth,
      node.__maxHeight,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const {
      altText,
      height,
      width,
      imageKey,
      maxWidth,
      maxHeight,
      caption,
      src,
      showCaption,
    } = serializedNode;
    const node = $createImageNode({
      imageKey,
      altText,
      height,
      maxWidth,
      maxHeight,
      showCaption,
      src,
      width,
    });
    const nestedEditor = node.__caption;
    const editorState = nestedEditor.parseEditorState(caption.editorState);
    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState);
    }
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    element.setAttribute("width", this.__width.toString());
    element.setAttribute("height", this.__height.toString());
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (_: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    imageKey: string,
    altText: string,
    width?: "100%" | number,
    height?: "100%" | number,
    maxWidth?: number,
    maxHeight?: number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__imageKey = imageKey;
    this.__altText = altText;
    this.__maxWidth = maxWidth ?? 0;
    this.__maxHeight = maxHeight ?? 0;
    this.__width = width ?? "100%";
    this.__height = height ?? "100%";
    this.__showCaption = showCaption ?? false;
    this.__caption = caption ?? createEditor();
    this.__captionsEnabled = captionsEnabled ?? false;
  }

  exportJSON(): SerializedImageNode {
    return {
      imageKey: this.__imageKey,
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height,
      width: this.__width,
      maxHeight: this.__maxHeight,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      type: "image",
      version: 1,
    };
  }

  setWidthAndHeight(width: number, height: number): void {
    const writable = this.getWritable();
    writable.__maxWidth = width;
    writable.__maxHeight = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getImageKey(): string {
    return this.__imageKey;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        maxHeight={this.__maxHeight}
        nodeKey={this.getKey()}
        showCaption={this.__showCaption}
        caption={this.__caption}
        captionsEnabled={this.__captionsEnabled}
        resizable={true}
      />
    );
  }
}

export function $createImageNode({
  altText,
  imageKey,
  height,
  maxWidth = 500,
  maxHeight,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src,
      imageKey,
      altText,
      width,
      height,
      maxWidth,
      maxHeight,
      showCaption,
      caption,
      captionsEnabled,
      key,
    ),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
