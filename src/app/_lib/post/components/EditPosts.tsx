"use client";
import { Image as ImageIcon, ImagePlus, MapPin, Trash, X } from "lucide-react";
import React, {
  type ChangeEvent,
  type RefObject,
  type ReactNode,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDndContext,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../../shared/SortableItem";
import {
  ImageUpload,
  Dropzone,
  DropzoneContent,
} from "@/_lib/shared/components/ImageUpload";
import { cn } from "../../utils/cx";
import type { PostForm as Post, PostFormImage } from "~/server/lib/types";
import { usePostActions } from "../hooks/usePostActions";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import {
  ImageScrollTrackingContextProvider,
  useImageScrollTracking,
} from "../contexts/ImageScrollTrackingContext";
import { usePostListScrollTracking } from "../contexts/PostListScrollTrackingContext";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { useImageSensors } from "../hooks/useImageSensors";
import { useDndState } from "../hooks/useDndState";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../ui/badge";
import { PostsHeaderDnd } from "./PostsHeaderDnd";

export function EditPosts() {
  return (
    <ImageScrollTrackingContextProvider<HTMLDivElement, HTMLLIElement>>
      <SelectedPostViewContent />
    </ImageScrollTrackingContextProvider>
  );
}

function SelectedPostViewContent() {
  const api = useTRPC();
  const { state, dispatch } = usePosts();

  const {
    scrollToImage,
    containerRef: scrollContainerRef,
    getImageElementsMap,
    setImageElementRef,
  } = useImageScrollTracking<HTMLDivElement, HTMLLIElement>();
  const onImageIntersect = useCallback(
    (_element: Element, intersectId: string) => {
      dispatch({ type: "SELECT_IMAGE", payload: intersectId });
    },
    [dispatch],
  );

  const {
    handleStartNewPost,
    handleDeletePost,
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleImageSelect,
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
  const draggedImage = selectedPostForm.images.find(
    (image) => image.id === activeImageId,
  );

  const handleDropzoneFilesChange = (files: FileList) => {
    // Convert FileList to ChangeEvent format for compatibility
    const mockEvent = {
      target: { files },
    } as ChangeEvent<HTMLInputElement>;
    void handleFilesChange(mockEvent);
  };

  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);
  const { data: uploadingState } = useQuery(
    api.diary.getMultipleImageUploadStatus.queryOptions(
      {
        entryId,
        diaryId,
        keys: Array.from(state.imageKeyToImageId.keys()),
        keyToIdMap: state.imageKeyToImageId,
      },
      {
        enabled: state.imageKeyToImageId.size > 0,
        refetchInterval: 3000,
      },
    ),
  );
  useEffect(() => {
    if (!uploadingState) {
      return;
    }
    dispatch({ type: "UPDATE_IMAGES_STATUS", payload: uploadingState });
  }, [uploadingState, dispatch]);

  const selectedImage = selectedPostForm.images.find(
    (image) => image.isSelected,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  function selectNewImage() {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-2 rounded-xl bg-card p-6 text-card-foreground">
      <div className="flex items-center justify-between self-stretch">
        <h3>Posts</h3>
        <Button type="button" variant="outline" onClick={handleStartNewPost}>
          Add
        </Button>
      </div>

      <PostsHeaderDnd />

      <Separator />

      <div className="relative">
        <div
          className="hide-scrollbar h-[200px] snap-x snap-mandatory overflow-x-auto scroll-smooth rounded"
          ref={scrollContainerRef}
        >
          {selectedPostForm.images.length === 0 && (
            <ImageUpload onChange={handleDropzoneFilesChange}>
              {({
                handleDragOver,
                handleDrop,
                handleFileChange: _handleFileChange,
              }) => (
                <Dropzone
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                >
                  <DropzoneContent id="image-upload">
                    <ImagePlus />
                    <p className="text-xs leading-tight">
                      Drop images or click
                    </p>
                    <Input
                      ref={imageInputRef}
                      id="image-upload"
                      type="file"
                      onChange={handleFilesChange}
                      multiple
                      accept="image/*"
                      className="sr-only"
                    />
                  </DropzoneContent>
                </Dropzone>
              )}
            </ImageUpload>
          )}
          {selectedPostForm.images.length > 0 && (
            <ul className="flex h-full">
              {selectedPostForm.images.map((image) => {
                return (
                  <li
                    key={image.id}
                    ref={setImageElementRef(image.id)}
                    className="w-full flex-shrink-0 flex-grow snap-center"
                  >
                    <ScrollableImageContainer<HTMLImageElement>
                      id={image.id}
                      onIntersect={onImageIntersect}
                    >
                      {({ ref }) => (
                        <ImageRenderer
                          showErrorText={true}
                          image={image}
                          ref={ref}
                        />
                      )}
                    </ScrollableImageContainer>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
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
                          const element = getImageElementsMap().get(image.id);
                          if (element) {
                            handleImageSelect(image.id, scrollToImage, element);
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

      <Separator />

      {selectedPostForm.images.length > 0 && (
        <>
          <button
            type="button"
            className="text-md flex gap-1 text-muted-foreground"
            onClick={() => selectNewImage()}
          >
            <ImageIcon />
            Add New Images
          </button>
          <input
            ref={imageInputRef}
            type="file"
            onChange={handleFilesChange}
            multiple
            accept="image/*"
            className="sr-only"
          />
          <Separator />
        </>
      )}
      {!!selectedImage && (
        <button
          type="button"
          className="text-md flex gap-1 text-muted-foreground"
          onClick={() => {
            dispatch({
              type: "DELETE_CURRENT_IMAGE",
              payload: { imageId: selectedImage.id },
            });
          }}
        >
          <X />
          Delete Image
        </button>
      )}
      <Separator />
      <button type="button" className="flex gap-1 text-muted-foreground">
        <MapPin />
        Edit Images Location
      </button>
      <Separator />
      <Input
        placeholder="Title..."
        value={selectedPostForm.title}
        onChange={(e) => handleTitleChange(e.target.value)}
      />
      <Textarea
        placeholder="Description..."
        className="h-[100px] resize-none p-2"
        value={selectedPostForm.description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
      />
      <div className="flex items-center">
        {state.posts.length > 1 && (
          <Button
            onClick={handleDeletePost}
            variant="destructive"
            type="button"
          >
            <Trash />
          </Button>
        )}
      </div>
    </div>
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

type ImageContainerProps<U extends Element> = {
  id: string;
  children: ({ ref }: { ref: (node: U | null) => void }) => ReactNode;
  onIntersect: (element: Element, intersectionId: string) => void;
  rootMargin?: string;
};

function ScrollableImageContainer<U extends Element>({
  id,
  children,
  onIntersect,
  rootMargin,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    useImageScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (element: Element) => {
        onIntersect(element, id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically,
    threshold: 0.5,
    rootMargin,
  });
  return children({ ref });
}

function PostScrollableContainer<U extends Element>({
  id,
  children,
  onIntersect,
  rootMargin,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    usePostListScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (element: Element) => {
        onIntersect(element, id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically,
    threshold: 0.5,
    rootMargin,
  });
  return children({ ref });
}

export function PostsListHeader({
  scrollToImage,
  getImageElementsMap,
}: {
  scrollToImage: (element: Element, instant?: boolean) => void;
  getImageElementsMap: () => Map<string, HTMLLIElement>;
}) {
  const {
    dispatch,
    state: { posts },
  } = usePosts();

  const {
    scrollToImage: scrollToPostImage,
    containerRef: scrollPostContainerRef,
    getImageElementsMap: getPostImageElementsMap,
  } = usePostListScrollTracking<HTMLUListElement, HTMLLIElement>();
  const onPostImageIntersect = useCallback(
    (_element: Element, intersectId: string) => {
      dispatch({ type: "START_EDITING", payload: intersectId });
    },
    [dispatch],
  );
  const { handleEditPost: onEditPost } = usePostActions();
  const { active } = useDndContext();
  const isDragging = active !== null;

  const spacers = (
    <>
      <li className="h-10 w-10 shrink-0 bg-green-200"></li>
      <li className="h-10 w-10 shrink-0 bg-green-200"></li>
      <li className="h-10 w-5 shrink-0 bg-green-200"></li>
    </>
  );
  return (
    <ul
      ref={scrollPostContainerRef}
      className={cn(
        "flex snap-x snap-mandatory gap-2 overflow-x-auto rounded bg-gray-300 px-7 py-3",
        isDragging && "snap-none",
      )}
    >
      {spacers}
      {posts.map((post) => {
        return (
          <SortableItem key={post.id} id={post.id}>
            {(props) => {
              return (
                <li
                  {...props.listeners}
                  {...props.attributes}
                  onClick={() => {
                    onEditPost(
                      post,
                      scrollToPostImage,
                      getPostImageElementsMap().get(post.id)!,
                    );
                    // Scroll to first image when post is selected
                    if (post.images.length > 0) {
                      const firstImageId = post.images[0]!.id;
                      const imageElement =
                        getImageElementsMap().get(firstImageId);
                      scrollToImage(imageElement!, true);
                    }
                  }}
                  style={{
                    ...props.style,
                    opacity: props.isDragging ? 0 : 1,
                  }}
                  ref={(el) => {
                    props.setNodeRef(el);
                    const map = getPostImageElementsMap();
                    if (el) {
                      map.set(post.id, el);
                    } else {
                      map.delete(post.id);
                    }
                  }}
                  className={cn(
                    "snap-center rounded-lg border-2",
                    post.isSelected && "border-blue-400 ring-1 ring-blue-300",
                  )}
                >
                  <PostScrollableContainer<HTMLDivElement>
                    id={post.id}
                    onIntersect={onPostImageIntersect}
                    rootMargin="0px -40% 0px -40%"
                  >
                    {({ ref }) => (
                      <div ref={ref}>
                        {post.images.length > 0 && (
                          <div className="relative h-10 w-10">
                            <Badge className="absolute right-0 top-0 block h-5 min-w-5 -translate-y-1/2 translate-x-1/2 rounded-full p-0 text-center font-mono tabular-nums">
                              {post.images.length}
                            </Badge>
                            <ImageRenderer image={post.images[0]!} />
                          </div>
                        )}
                        {post.images.length === 0 && (
                          <ImageIcon className="h-10 w-10 text-foreground" />
                        )}
                      </div>
                    )}
                  </PostScrollableContainer>
                </li>
              );
            }}
          </SortableItem>
        );
      })}
      {spacers}
    </ul>
  );
}
