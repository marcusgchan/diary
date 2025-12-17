import { createContext, useContext, useState } from "react";
import {
  type SensorDescriptor,
  type SensorOptions,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

type PostsDndContextData = {
  activeId: string | null;
  handleDragStart: (e: DragStartEvent) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  isDragging: boolean;
};

const PostsDndContext = createContext<PostsDndContextData | null>(null);

type PostsDndContextProviderProps = {
  onDragEnd: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => void;
  children: React.ReactNode;
};

export function PostsDndContextProvider({
  onDragEnd,
  children,
}: PostsDndContextProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // dispatch({
      //   type: "REORDER_POSTS",
      //   payload: { activeId: active.id as string, overId: over.id as string },
      // });
      onDragEnd(active.id, over.id);
    }

    setActiveId(null);
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

  const ctx = {
    handleDragStart,
    handleDragEnd,
    onDragEnd,
    sensors,
    activeId,
    isDragging: activeId != undefined,
  };

  return (
    <PostsDndContext.Provider value={ctx}>{children}</PostsDndContext.Provider>
  );
}

export function usePostDnd() {
  const ctx = useContext(PostsDndContext);

  if (!ctx) {
    throw new Error(
      "usePostsDnd() must be used inside PostsDndContextProvider",
    );
  }

  return ctx;
}
