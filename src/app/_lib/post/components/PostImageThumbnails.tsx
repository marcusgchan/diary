"use client";
import React, { type RefObject } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../../shared/SortableItem";
import { cn } from "../../utils/cx";
import type { PostForm as Post, PostFormImage } from "~/server/lib/types";
import { useImageScrollTracking } from "../contexts/ImageScrollTrackingContext";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import { useImageSensors } from "../hooks/useImageSensors";
import { useDndState } from "../hooks/useDndState";
import { Skeleton } from "../../ui/skeleton";

export function PostImageThumbnails() {
  const { state, dispatch } = usePosts();
  const { scrollToImage, getImageElementsMap } = useImageScrollTracking<
    HTMLDivElement,
    HTMLLIElement
  >();
  const { imageSelectAction } = usePostActions();

  const imageSensors = useImageSensors();
  const {
    activeId: activeImageId,
    onDragStart: handleImageDragStart,
    onDragEnd: handleImageDragEnd,
  } = useDndState({
    onDragEnd: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
      dispatch({
        type: "REORDER_IMAGES",
        payload: {
          activeImageId: activeId as string,
          overImageId: overId as string,
        },
      });
    },
  });

  const selectedPostForm = state.posts.find((post) => post.isSelected)!;
  const draggedImage = selectedPostForm.images.find(
    (image) => image.id === activeImageId,
  );

  return (
    <DndContext
      sensors={imageSensors}
      collisionDetection={closestCenter}
      onDragStart={handleImageDragStart}
      onDragEnd={handleImageDragEnd}
    >
      <SortableContext
        items={selectedPostForm.images.map((img) => ({ id: img.id }))}
        strategy={horizontalListSortingStrategy}
      >
        <ul className="flex h-12 items-center justify-center gap-1">
          {selectedPostForm.images.map((image: Post["images"][number]) => {
            return (
              <SortableItem key={image.id} id={image.id}>
                {(props) => (
                  <li key={image.id} className="">
                    <button
                      type="button"
                      onClick={() => {
                        imageSelectAction(image.id);
                        const element = getImageElementsMap().get(image.id);
                        if (element) {
                          scrollToImage(element);
                        }
                      }}
                      {...props.listeners}
                      {...props.attributes}
                      ref={props.setNodeRef}
                      style={{
                        ...props.style,
                        opacity: props.isDragging ? 0 : 1,
                      }}
                      className={cn(
                        "block aspect-square h-10 w-10 cursor-grab overflow-hidden rounded-lg border-2 transition-all active:cursor-grabbing",
                        image.isSelected
                          ? "scale-110 border-blue-400 ring-1 ring-blue-300"
                          : "border-gray-300 hover:border-gray-400",
                      )}
                    >
                      <ImageRenderer image={image} key={image.id} />
                    </button>
                  </li>
                )}
              </SortableItem>
            );
          })}
        </ul>
      </SortableContext>
      <DragOverlay>
        {draggedImage && (
          <div className="aspect-square h-10 w-10 rotate-6 transform overflow-hidden rounded border-2 border-blue-500 opacity-90 shadow-lg">
            <ImageRenderer image={draggedImage} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

type ImageProps = {
  image: PostFormImage;
  showErrorText?: boolean;
  ref?: RefObject<HTMLImageElement | null>;
};

const ImageRenderer = React.forwardRef<
  HTMLImageElement,
  Omit<ImageProps, "ref">
>(function ImageRenderer({ image, showErrorText = false }, ref) {
  function stripUuid(name: string) {
    let count = 0;
    let i = 0;
    while (count < 5) {
      const ch = name[i];
      if (ch === "-") {
        count++;
      }
      i++;
    }

    return name.substring(i);
  }

  if (image.type === "loaded") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        ref={ref}
        src={`/api/image/${image.key}`}
        className="pointer-events-none h-full w-full object-cover"
        alt={image.name}
      />
    );
  }

  if (image.type === "compression_error") {
    return (
      <div
        ref={ref}
        className="h-full w-full content-center items-center bg-red-200 p-2 text-center"
      >
        {showErrorText && (
          <p>There was a problem uploading image: {stripUuid(image.name)}</p>
        )}
      </div>
    );
  }

  return <Skeleton ref={ref} className="h-full w-full" />;
});
