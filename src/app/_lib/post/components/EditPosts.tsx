"use client";
import { Image as ImageIcon, MapPin, Plus, Trash, X } from "lucide-react";
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
import { Label } from "../../ui/label";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../../shared/SortableItem";
import { cn } from "../../utils/cx";
import type { PostForm as Post, PostFormImage } from "~/server/lib/types";
import { useScrollToImage } from "../hooks/useScrollToImage";
import { usePostActions } from "../hooks/usePostActions";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { usePostDnD } from "../hooks/usePostDnD";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { useImageDnd } from "../hooks/useImageDnD";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../ui/badge";

export function EditPosts() {
  return <SelectedPostView />;
}

function ImageUpload({
  onChange,
  children,
}: {
  onChange: (files: FileList) => void;
  children: ({
    handleDrop,
    handleDragOver,
    handleFileChange,
  }: {
    handleDrop: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  }) => React.ReactNode;
}) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files === null || files.length === 0) {
      return;
    }
    onChange(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      return;
    }

    // Filter for image files only
    const imageFiles = Array.from(files).filter((file) =>
      file.type.includes("image/"),
    );

    if (imageFiles.length === 0) {
      return;
    }

    // Create a new FileList-like object
    const dt = new DataTransfer();
    imageFiles.forEach((file) => dt.items.add(file));
    onChange(dt.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return children({ handleDragOver, handleDrop, handleFileChange });
}

function Dropzone({
  handleDrop,
  handleDragOver,
  children,
}: {
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="grid h-full place-items-center"
    >
      {children}
    </div>
  );
}

function DropzoneContent({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Label
      htmlFor={id}
      className="grid h-full w-full cursor-pointer content-center justify-center gap-1 rounded border-2 border-dashed p-4 text-center text-accent-foreground backdrop-blur-sm  [grid-auto-rows:max-content]"
    >
      {children}
    </Label>
  );
}

function ImgLogo() {
  return (
    <svg
      className="mx-auto h-8 w-8 text-accent-foreground"
      stroke="currentColor"
      fill="none"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectedPostView() {
  const api = useTRPC();
  const { state, dispatch } = usePosts();
  const {
    activeId,
    handleDragStart,
    handleDragEnd,
    sensors: postSensors,
  } = usePostDnD(dispatch);

  const activePost = activeId
    ? state.posts.find((p) => p.id === activeId)
    : null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollToImage, isScrollingProgrammatically } =
    useScrollToImage(scrollContainerRef);

  const {
    handleStartNewPost,
    handleDeletePost,
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleImageSelect,
  } = usePostActions();

  const imageElementsRef = useRef<Map<string, HTMLLIElement>>(null);

  function getImageElementsMap() {
    if (imageElementsRef.current === null) {
      imageElementsRef.current = new Map<string, HTMLLIElement>();
      return imageElementsRef.current;
    }
    return imageElementsRef.current;
  }

  const {
    sensors: imageSensors,
    activeImageId,
    handleImageDragEnd,
    handleImageDragStart,
  } = useImageDnd(dispatch);

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

  const onImageIntersect = useCallback(
    (_element: Element, intersectId: string) => {
      dispatch({ type: "SELECT_IMAGE", payload: intersectId });
    },
    [dispatch],
  );

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

      <DndContext
        sensors={postSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <SortableContext
          items={state.posts.map((post) => ({ id: post.id }))}
          strategy={verticalListSortingStrategy}
        >
          <PostsListHeader />
        </SortableContext>
        <DragOverlay>
          {activePost ? <DragOverlayItem post={activePost} /> : null}
        </DragOverlay>
      </DndContext>

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
                    <ImgLogo />
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
                const rootElement = scrollContainerRef.current;
                return (
                  <li
                    key={image.id}
                    ref={(node) => {
                      const map = getImageElementsMap();
                      if (node) {
                        map.set(image.id, node);
                      } else {
                        map.delete(image.id);
                      }
                    }}
                    className="w-full flex-shrink-0 flex-grow snap-center"
                  >
                    {rootElement ? (
                      <ScrollableImageContainer<
                        HTMLDivElement,
                        HTMLImageElement
                      >
                        id={image.id}
                        onIntersect={onImageIntersect}
                        isScrollingProgrammatically={
                          isScrollingProgrammatically
                        }
                        rootElement={rootElement}
                      >
                        {({ ref }) => (
                          <ImageRenderer
                            showErrorText={true}
                            image={image}
                            ref={ref}
                          />
                        )}
                      </ScrollableImageContainer>
                    ) : (
                      <ImageRenderer showErrorText={true} image={image} />
                    )}
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

type ImageContainerProps<T extends Element, U extends Element> = {
  id: string;
  children: ({ ref }: { ref: RefObject<U | null> }) => ReactNode;
  isScrollingProgrammatically: boolean;
  onIntersect: (element: Element, intersectionId: string) => void;
  rootElement: T;
};

function ScrollableImageContainer<T extends Element, U extends Element>({
  id,
  children,
  onIntersect,
  isScrollingProgrammatically,
  rootElement,
}: ImageContainerProps<T, U>) {
  const { ref } = useIntersectionObserver<T, U>({
    onIntersect,
    rootElement,
    intersectId: id,
    disabled: isScrollingProgrammatically,
  });
  return children({ ref });
}

function PostsListHeader() {
  const {
    state: { posts },
  } = usePosts();
  const { handleEditPost: onEditPost } = usePostActions();

  return (
    <div className="flex flex-col items-center gap-2">
      <ul className="flex grow-0 gap-2">
        {posts.map((post) => {
          return (
            <SortableItem key={post.id} id={post.id}>
              {(props) => {
                return (
                  <li
                    {...props.listeners}
                    {...props.attributes}
                    onClick={() => onEditPost(post)}
                    style={{
                      ...props.style,
                      opacity: props.isDragging ? 0 : 1,
                    }}
                    ref={props.setNodeRef}
                    className={cn(
                      "rounded-lg border-2",
                      post.isSelected && "border-blue-400 ring-1 ring-blue-300",
                    )}
                  >
                    {post.images.length > 0 && (
                      <div className="relative h-10 w-10">
                        <Badge className="absolute right-0 top-0 block h-5 min-w-5 -translate-y-1/2 translate-x-1/2 rounded-full p-0 text-center font-mono tabular-nums">
                          {post.images.length}
                        </Badge>
                        <ImageRenderer image={post.images[0]!} />
                      </div>
                    )}
                    {post.images.length === 0 && (
                      <ImageIcon className="h-10 w-10 text-gray-300" />
                    )}
                  </li>
                );
              }}
            </SortableItem>
          );
        })}
      </ul>
    </div>
  );
}

function DragOverlayItem({ post }: { post: Post }) {
  return (
    <div className="rotate-3 transform rounded border-2 border-black bg-white p-2 opacity-90 shadow-lg">
      <ul className="flex flex-col gap-2">
        {post.images.map((image) => (
          <li
            key={image.id}
            className="aspect-square min-h-0 w-12 flex-shrink-0 flex-grow-0 rounded border-2 border-black"
          >
            <ImageRenderer image={image} />
          </li>
        ))}
      </ul>
    </div>
  );
}
