import { useState } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { PostsAction } from "./postsReducer";

export function usePostDnD(dispatch: React.Dispatch<PostsAction>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      dispatch({
        type: "REORDER_POSTS",
        payload: { activeId: active.id as string, overId: over.id as string },
      });
    }

    setActiveId(null);
  }

  function handleImageDragStart(event: DragStartEvent) {
    setActiveImageId(event.active.id as string);
  }

  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      dispatch({
        type: "REORDER_IMAGES",
        payload: {
          activeImageId: active.id as string,
          overImageId: over.id as string,
        },
      });
    }

    setActiveImageId(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return {
    activeId,
    activeImageId,
    handleDragStart,
    handleDragEnd,
    handleImageDragStart,
    handleImageDragEnd,
    sensors,
  };
}
