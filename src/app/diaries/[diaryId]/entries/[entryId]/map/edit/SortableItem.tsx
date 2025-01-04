import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function SortableItem({
  id,
  children,
}: {
  id: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="col-span-2 grid grid-cols-subgrid"
    >
      {children}
      <button
        type="button"
        className="justify-self-center px-2"
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </button>
    </div>
  );
}
