// move active id to reducer, scroll not selecting right active img
"use client";
import { Images, Plus, Trash } from "lucide-react";
import {
  type ChangeEvent,
  type RefObject,
  useRef,
  useState,
  useReducer,
  useCallback,
} from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../shared/SortableItem";
import { cn } from "../utils/cx";
import { postsReducer, initialState, type Post } from "./postsReducer";
import { useScrollToImage } from "./useScrollToImage";
import { useIntersectionObserver } from "../utils/useIntersectionObserver";
import { usePostActions } from "./usePostActions";

export function EditPosts() {
  const [state, dispatch] = useReducer(postsReducer, initialState);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const selectedPost = state.posts.find((p) => p.id === state.selectedPostId)!;
  const activePost = activeId
    ? state.posts.find((p) => p.id === activeId)
    : null;
  const activeImage = activeImageId
    ? (selectedPost.images.find((img) => img.id === activeImageId) ?? null)
    : null;

  // Get the selected image for the current post from reducer state
  const currentSelectedImageId =
    state.postImageSelections.get(state.selectedPostId) ??
    selectedPost.images[0]?.id ??
    null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollToImage, isScrollingProgrammatically } =
    useScrollToImage(scrollContainerRef);

  const {
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleStartNewPost,
    handleEditPost,
    handleDeletePost,
  } = usePostActions({ dispatch, state, scrollToPost: scrollToImage });

  const handleImageSelect = (imageId: string) => {
    dispatch({ type: "SELECT_IMAGE", payload: imageId });
    scrollToImage(imageId);
  };

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
          onImageIntersect={onImageIntersect}
          selectedPostForm={selectedPost}
          selectedImageId={currentSelectedImageId}
          setSelectedImageId={handleImageSelect}
          handleTitleChange={handleTitleChange}
          handleDescriptionChange={handleDescriptionChange}
          handleFilesChange={handleFilesChange}
          onDelete={handleDeletePost}
          scrollContainerRef={scrollContainerRef}
          onImageDragStart={handleImageDragStart}
          onImageDragEnd={handleImageDragEnd}
          activeImageId={activeImageId}
          activeImage={activeImage}
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

type SelectedPostViewProps = {
  onImageIntersect: (image: Element) => void;
  isScrollingProgrammatically: boolean;
  selectedPostForm: Post;
  selectedImageId: string | null;
  setSelectedImageId: (imageId: string) => void;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDelete: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onImageDragStart: (event: DragStartEvent) => void;
  onImageDragEnd: (event: DragEndEvent) => void;
  activeImageId: string | null;
  activeImage: PostImage | null;
};

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

function SelectedPostView({
  onImageIntersect,
  isScrollingProgrammatically,
  selectedPostForm,
  selectedImageId,
  setSelectedImageId,
  handleTitleChange,
  handleDescriptionChange,
  handleFilesChange,
  onDelete,
  scrollContainerRef,
  onImageDragStart,
  onImageDragEnd,
  activeImageId,
  activeImage,
}: SelectedPostViewProps) {
  const imageSensors = useSensors(
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-full w-full object-cover"
                      src={image.dataUrl}
                      alt={image.name}
                    />
                  </ImageItem>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <DndContext
        sensors={imageSensors}
        collisionDetection={closestCenter}
        onDragStart={onImageDragStart}
        onDragEnd={onImageDragEnd}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.dataUrl}
                          className="pointer-events-none h-full w-full object-cover"
                          alt={image.name}
                        />
                      </button>
                    </li>
                  )}
                </SortableItem>
              );
            })}
          </ul>
        </SortableContext>
        <DragOverlay>
          {activeImage ? (
            <div className="aspect-square h-10 w-10 rotate-6 transform overflow-hidden rounded border-2 border-blue-500 opacity-90 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.dataUrl}
                className="h-full w-full object-cover"
                alt={activeImage.name}
              />
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
        <Button onClick={onDelete} variant="destructive" type="button">
          <Trash />
        </Button>
        {/* <Button
          className="ml-auto"
          variant="secondary"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          disabled={selectedPostForm.images.length === 0}
          onClick={onSave}
          type="button"
          className="ml-2"
        >
          Save
        </Button> */}
      </div>
    </div>
  );
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.dataUrl}
                            className="inline-block h-full w-full object-cover"
                            alt={image.name}
                          />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.dataUrl}
              className="inline-block h-full w-full object-cover"
              alt={image.name}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
