import { useState, useCallback } from "react";
import type {
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";

export function useDndState({
  onDragEnd,
}: {
  onDragEnd: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => void;
}) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        onDragEnd(active.id, over.id);
      }

      setActiveId(null);
    },
    [onDragEnd],
  );

  return {
    activeId,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  };
}
