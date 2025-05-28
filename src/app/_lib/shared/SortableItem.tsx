import type React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type DraggableAttributes } from "@dnd-kit/core";
import { type SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: ({
    attributes,
    listeners,
    style,
    setNodeRef,
    isDragging,
  }: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
    style: { transform: string | undefined; transition: string | undefined };
    setNodeRef: (node: HTMLElement | null) => void;
    isDragging: boolean;
  }) => React.JSX.Element;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return children({ attributes, listeners, style, setNodeRef, isDragging });
}
