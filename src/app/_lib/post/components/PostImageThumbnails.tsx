"use client";
import React, {
  type RefObject,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { CircleChevronLeft, CircleChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../../shared/SortableItem";
import { cn } from "../../utils/cx";
import type { PostForm as Post, PostFormImage } from "~/server/lib/types";
import { useImageScrollTracking } from "../contexts/ImageScrollTrackingContext";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import { useImageSensors } from "../hooks/useImageSensors";
import { useDndState } from "../hooks/useDndState";
import { Skeleton } from "../../ui/skeleton";

export function PostImageThumbnails() {
  const { state, dispatch } = usePosts();
  const {
    scrollToImage: scrollThumbnailToImage,
    getImageElementsMap: getThumbnailElementsMap,
    containerRef,
    setImageElementRef,
  } = useImageScrollTracking();

  const {
    imageSelectAction,
    imageIntersectAction,
    nextImageAction,
    previousImageAction,
  } = usePostActions();

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
  const images = selectedPostForm.images;
  const draggedImage = images.find((image) => image.id === activeImageId);

  const isDragging = activeImageId !== null;

  function handleSelectImage(imageId: string) {
    imageSelectAction(imageId);
    const thumbnailElement = getThumbnailElementsMap().get(imageId);
    if (thumbnailElement) {
      scrollThumbnailToImage(thumbnailElement);
    }
  }

  function handlePreviousImage() {
    previousImageAction();
    const selectedImageIndex = images.findIndex((image) => image.isSelected);
    const previousImageIndex = selectedImageIndex - 1;
    if (previousImageIndex >= 0) {
      const el = getThumbnailElementsMap().get(images[previousImageIndex]!.id)!;
      scrollThumbnailToImage(el);
    }
  }

  function handleNextImage() {
    nextImageAction();
    const selectedImageIndex = images.findIndex((image) => image.isSelected);
    const nextImageIndex = selectedImageIndex + 1;
    if (nextImageIndex < images.length) {
      const el = getThumbnailElementsMap().get(images[nextImageIndex]!.id)!;
      scrollThumbnailToImage(el);
    }
  }

  const firstImageSelected = useMemo(() => {
    return images.findIndex((image) => image.isSelected) === 0;
  }, [images]);

  const lastImageSelected = useMemo(() => {
    return images.findIndex((image) => image.isSelected) === images.length - 1;
  }, [images]);

  const spacers = (
    <>
      <li className="h-10 w-10 shrink-0"></li>
      <li className="h-10 w-10 shrink-0"></li>
      <li className="h-10 w-5 shrink-0"></li>
    </>
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={imageSensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={handleImageDragStart}
      onDragEnd={handleImageDragEnd}
    >
      <SortableContext
        items={images.map((img) => ({ id: img.id }))}
        strategy={horizontalListSortingStrategy}
      >
        <div className="relative">
          <button
            type="button"
            onClick={handlePreviousImage}
            className={cn(
              "absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background",
              firstImageSelected && "hidden",
            )}
          >
            <CircleChevronLeft className="text-foreground" />
          </button>
          <button
            type="button"
            onClick={handleNextImage}
            className={cn(
              "absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background",
              lastImageSelected && "hidden",
            )}
          >
            <CircleChevronRight className="text-foreground" />
          </button>
          <ul
            ref={containerRef}
            className={cn(
              "hide-scrollbar relative flex h-12 snap-x snap-mandatory items-center gap-1 overflow-x-auto rounded px-7",
              isDragging && "snap-none",
            )}
          >
            {spacers}
            {images.map((image: Post["images"][number]) => {
              return (
                <SortableItem key={image.id} id={image.id}>
                  {(props) => (
                    <li
                      key={image.id}
                      ref={(el) => {
                        props.setNodeRef(el);
                        setImageElementRef(image.id)(el);
                      }}
                      onClick={() => handleSelectImage(image.id)}
                      style={{
                        ...props.style,
                        opacity: props.isDragging ? 0 : 1,
                      }}
                      className={cn(
                        "snap-center rounded-lg border-2",
                        image.isSelected &&
                          "border-blue-400 ring-1 ring-blue-300",
                      )}
                    >
                      <ImageScrollableContainer
                        id={image.id}
                        onIntersect={imageIntersectAction}
                        threshold={0.6}
                        rootMargin="0px -45% 0px -45%"
                        disabled={isDragging}
                      >
                        {({ ref }) => (
                          <div
                            ref={ref}
                            {...props.listeners}
                            {...props.attributes}
                            className="h-10 w-10 cursor-grab active:cursor-grabbing"
                          >
                            <ImageRenderer image={image} />
                          </div>
                        )}
                      </ImageScrollableContainer>
                    </li>
                  )}
                </SortableItem>
              );
            })}
            {spacers}
          </ul>
        </div>
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

type ImageContainerProps<U extends Element> = {
  id: string;
  children: ({ ref }: { ref: (node: U | null) => void }) => ReactNode;
  onIntersect: (intersectionId: string) => void;
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
};

function ImageScrollableContainer<U extends Element>({
  id,
  children,
  onIntersect,
  threshold = 0,
  rootMargin,
  disabled = false,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    useImageScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (_element: Element) => {
        onIntersect(id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically || disabled,
    threshold,
    rootMargin,
  });
  return children({ ref });
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
        className="pointer-events-none h-full w-full rounded object-cover"
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
