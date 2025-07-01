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

export function useImageDnd(dispatch: React.ActionDispatch<[PostsAction]>) {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

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
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return {
    activeImageId,
    handleImageDragStart,
    handleImageDragEnd,
    sensors,
  };
}
