// move active id to reducer, scroll not selecting right active img
"use client";
import { Plus, Trash } from "lucide-react";
import { type ChangeEvent, type RefObject, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../shared/SortableItem";
import { cn } from "../utils/cx";
import { type Post, type Image } from "./postsReducer";
import { useScrollToImage } from "./useScrollToImage";
import { useIntersectionObserver } from "../utils/useIntersectionObserver";
import { usePostActions } from "./usePostActions";
import { usePostDnD } from "./usePostDnD";
import { Skeleton } from "../ui/skeleton";
import { usePosts } from "./PostsContext";
import { useImageDnd } from "./useImageDnD";

export function EditPosts() {
  const { state, dispatch } = usePosts();

  const { activeId, handleDragStart, handleDragEnd, sensors } =
    usePostDnD(dispatch);

  const selectedPost = state.posts.find((p) => p.id === state.selectedPostId)!;
  const activePost = activeId
    ? state.posts.find((p) => p.id === activeId)
    : null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollToImage, isScrollingProgrammatically } =
    useScrollToImage(scrollContainerRef);

  const { handleStartNewPost, handleEditPost } = usePostActions({
    dispatch,
    state,
    scrollToImage: scrollToImage,
  });

  const onImageIntersect = useCallback(
    (element: Element) => {
      const imageId = element.getAttribute("data-image-id");
      if (!imageId) {
        throw new Error("Image is missing data-image-id attribute");
      }
      dispatch({ type: "SELECT_IMAGE", payload: imageId });
    },
    [dispatch],
  );

  return (
    <div className="flex gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <SelectedPostView
          isScrollingProgrammatically={isScrollingProgrammatically}
          scrollToImage={scrollToImage}
          onImageIntersect={onImageIntersect}
          selectedPostForm={selectedPost}
          scrollContainerRef={scrollContainerRef}
        />
        <SortableContext
          items={state.posts.map((post) => ({ id: post.id }))}
          strategy={verticalListSortingStrategy}
        >
          <PostsAside
            posts={state.posts.filter((p) => p.images.length > 0)}
            onNewPost={handleStartNewPost}
            onEditPost={handleEditPost}
          />
        </SortableContext>
        <DragOverlay>
          {activePost ? <DragOverlayItem post={activePost} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type PostImage = Post["images"][number];

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
      className="grid h-full w-full cursor-pointer content-center justify-center gap-2 rounded border-2 border-dashed border-accent-foreground p-4 text-center text-accent-foreground backdrop-blur-sm  [grid-auto-rows:max-content]"
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

type SelectedPostViewProps = {
  onImageIntersect: (image: Element) => void;
  isScrollingProgrammatically: boolean;
  scrollToImage: ReturnType<typeof useScrollToImage>["scrollToImage"];
  selectedPostForm: Post;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

function SelectedPostView({
  onImageIntersect,
  isScrollingProgrammatically,
  scrollToImage,
  selectedPostForm,
  scrollContainerRef,
}: SelectedPostViewProps) {
  const { state, dispatch } = usePosts();
  const {
    handleDeletePost,
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleImageSelect: setSelectedImageId,
  } = usePostActions({ dispatch, state, scrollToImage: scrollToImage });

  const { sensors, activeImageId, handleImageDragEnd, handleImageDragStart } =
    useImageDnd(dispatch);

  const selectedImageId =
    state.postImageSelections.get(state.selectedPostId) ?? null;
  const draggedImage = state.posts
    .find((post) => post.id === state.selectedPostId)!
    .images.find((image) => image.id === activeImageId)!;

  const handleDropzoneFilesChange = (files: FileList) => {
    // Convert FileList to ChangeEvent format for compatibility
    const mockEvent = {
      target: { files },
    } as ChangeEvent<HTMLInputElement>;
    void handleFilesChange(mockEvent);
  };

  return (
    <div className="flex w-80 flex-col gap-2 rounded border-2 border-black p-2">
      <div className="relative">
        <div
          className="hide-scrollbar h-[200px] snap-x snap-mandatory overflow-x-auto scroll-smooth"
          ref={scrollContainerRef}
        >
          {selectedPostForm.images.length === 0 && (
            <ImageUpload onChange={handleDropzoneFilesChange}>
              {({ handleDragOver, handleDrop, handleFileChange }) => (
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
                      id="image-upload"
                      type="file"
                      onChange={handleFileChange}
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
                  <ImageItem
                    key={image.id}
                    image={image}
                    isScrollingProgrammatically={isScrollingProgrammatically}
                    onImageIntersect={onImageIntersect}
                    scrollableContainerRef={scrollContainerRef}
                  >
                    <ImageRenderer image={image} />
                  </ImageItem>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <DndContext
        sensors={sensors}
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
                        onClick={() => setSelectedImageId(image.id)}
                        {...props.listeners}
                        {...props.attributes}
                        ref={props.setNodeRef}
                        style={{
                          ...props.style,
                          opacity: props.isDragging ? 0 : 1,
                        }}
                        className={cn(
                          "block aspect-square h-10 w-10 cursor-grab overflow-hidden rounded border-2 transition-all active:cursor-grabbing",
                          image.id === selectedImageId
                            ? "scale-110 border-blue-500 ring-2 ring-blue-300"
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
          {activeImageId ? (
            <div className="aspect-square h-10 w-10 rotate-6 transform overflow-hidden rounded border-2 border-blue-500 opacity-90 shadow-lg">
              <ImageRenderer image={draggedImage} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <input
        placeholder="Title..."
        className="text-lg font-bold"
        value={selectedPostForm.title}
        onChange={(e) => handleTitleChange(e.target.value)}
      />
      <textarea
        placeholder="Description..."
        className="h-[100px] resize-none"
        value={selectedPostForm.description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
      />
      <div className="flex items-center">
        <Button onClick={handleDeletePost} variant="destructive" type="button">
          <Trash />
        </Button>
      </div>
    </div>
  );
}

type ImageProps = {
  image: Image;
};

function ImageRenderer({ image }: ImageProps) {
  if (image.type === "loaded") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={image.url}
        className="pointer-events-none h-full w-full object-cover"
        alt={image.name}
      />
    );
  }

  if (image.type === "error") {
    return <p>Could not load image</p>;
  }

  return <Skeleton className="h-full w-full" />;
}

type ImageContainer<T extends Element> = {
  children: React.JSX.Element;
  image: PostImage;
  onImageIntersect: (image: Element) => void;
  isScrollingProgrammatically: boolean;
  scrollableContainerRef: RefObject<T | null>;
};

function ImageItem<T extends Element>({
  children,
  image,
  onImageIntersect,
  isScrollingProgrammatically,
  scrollableContainerRef,
}: ImageContainer<T>) {
  const { ref } = useIntersectionObserver<HTMLLIElement, T>(
    onImageIntersect,
    isScrollingProgrammatically,
    scrollableContainerRef,
  );
  return (
    <li
      ref={ref}
      key={image.id}
      data-image-id={image.id}
      className="w-full flex-shrink-0 flex-grow snap-center border-2 border-black"
    >
      {children}
    </li>
  );
}

type PostsAsideProps = {
  posts: Post[];
  onNewPost: () => void;
  onEditPost: (post: Post) => void;
};

function PostsAside({ posts, onNewPost, onEditPost }: PostsAsideProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant="outline" onClick={onNewPost}>
        <Plus />
      </Button>
      <ul className="grid grow-0 gap-2">
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
                    className="rounded border-2 border-black p-2"
                  >
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
