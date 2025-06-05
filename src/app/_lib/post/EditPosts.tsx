// move active id to reducer, scroll not selecting right active img
"use client";
import { Images, Plus, Trash } from "lucide-react";
import {
  type ChangeEvent,
  type RefObject,
  useRef,
  useState,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
import { flushSync } from "react-dom";

function useScrollToPost(containerRef: RefObject<HTMLElement | null>) {
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  function scrollToPost(id: Post["id"], instant = false) {
    const el = document.querySelector(`[data-image-id="${id}"]`);
    console.log("in scrollToPost", instant, el)
    if (!el) return;

    if (instant) {
      console.log("instant scroll")
      el.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      });
      return;
    }

    setIsScrollingProgrammatically(true);

    const container = containerRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      setIsScrollingProgrammatically(false);
      container.removeEventListener("scrollend", handleScrollEnd);
    };
    container.addEventListener("scrollend", handleScrollEnd);

    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return { scrollToPost, isScrollingProgrammatically };
}

type IntersectionObserverReturn<T extends Element> = {
  ref: RefObject<T | null>;
};

function useIntersectionObserver<T extends Element, U extends Element>(
  onIntersect: (element: Element) => void,
  disabled: boolean,
  rootRef?: RefObject<U | null>,
): IntersectionObserverReturn<T> {
  const ref = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver>(null);

  useEffect(() => {
    if (disabled) return;
    if (ref.current === null) {
      throw new Error("ref not set");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const centerEntry = entries.find(
          (entry) => entry.intersectionRatio > 0.8,
        );

        if (centerEntry) {
          const element = centerEntry.target;
          if (element) {
            onIntersect(element);
          }
        }
      },
      {
        root: rootRef?.current,
        threshold: 0.8,
      },
    );

    observerRef.current = observer;
    observerRef.current.observe(ref.current);

    return () => observerRef.current!.disconnect();
  }, [ref, onIntersect, disabled, rootRef]);

  return { ref: ref };
}

export function EditPosts() {
  const [state, dispatch] = useReducer(postsReducer, initialState);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const selectedPost = state.posts.find((p) => p.id === state.selectedPostId)!;
  const activePost = activeId ? state.posts.find((p) => p.id === activeId) : null;
  const activeImage = activeImageId ? selectedPost.images.find((img) => img.id === activeImageId) ?? null : null;

  // Get the selected image for the current post from reducer state
  const currentSelectedImageId = state.postImageSelections.get(state.selectedPostId) ?? 
    selectedPost.images[0]?.id ?? 
    null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollToPost, isScrollingProgrammatically } = useScrollToPost(scrollContainerRef);

  const handleImageSelect = (imageId: string) => {
    dispatch({ type: "SELECT_IMAGE", payload: imageId });
    scrollToPost(imageId);
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

  async function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const success: Post["images"] = [];
    const failed = [];
    for (const file of files) {
      const { name, type, size } = file;
      await new Promise<void>((resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
          const dataUrl = fileReader.result as string;
          const id = crypto.randomUUID();
          success.push({
            id,
            name,
            type,
            size,
            dataUrl,
            order: 0, // Placeholder, will be set properly in reducer
          });
          resolve();
        };
        fileReader.onerror = () => {
          failed.push({ name, type, size, error: fileReader.error });
          resolve();
        };
      });
    }
    dispatch({ type: "ADD_IMAGES", payload: success });
  }

  function handleTitleChange(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { title: value } },
    });
  }

  function handleDescriptionChange(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { description: value } },
    });
  }

  function handleStartNewPost() {
    dispatch({ type: "START_NEW_POST" });
  }

  function handleEditPost(post: Post) {
    flushSync(() => {
      dispatch({ type: "START_EDITING", payload: post.id });
    });
    
    const selectedImageId = state.postImageSelections.get(post.id) ?? post.images[0]?.id;
    
    if (selectedImageId) {
        scrollToPost(selectedImageId, true);
    }
  }

  function handleSavePost() {
    dispatch({ type: "SAVE_POST" });
  }

  function handleDeletePost() {
    dispatch({ type: "DELETE_POST" });
  }

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
        payload: { activeImageId: active.id as string, overImageId: over.id as string },
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
          onSave={handleSavePost}
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
  onSave: () => void;
  onDelete: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onImageDragStart: (event: DragStartEvent) => void;
  onImageDragEnd: (event: DragEndEvent) => void;
  activeImageId: string | null;
  activeImage: PostImage | null;
};

type PostImage = Post["images"][number];

function SelectedPostView({
  onImageIntersect,
  isScrollingProgrammatically,
  selectedPostForm,
  selectedImageId,
  setSelectedImageId,
  handleTitleChange,
  handleDescriptionChange,
  handleFilesChange,
  onSave,
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

  return (
    <div className="flex w-80 flex-col gap-2 rounded border-2 border-black p-2">
      <div className="relative">
        <div
          className="hide-scrollbar h-[200px] snap-x snap-mandatory overflow-x-auto scroll-smooth"
          ref={scrollContainerRef}
        >
          <label className="absolute bottom-2 right-2 grid place-items-center">
            <Input
              type="file"
              onChange={handleFilesChange}
              multiple
              className="w-0 opacity-0 [grid-area:1/1]"
            />
            <Images className="[grid-area:1/1]" />
          </label>
          <ul className="flex h-full bg-blue-300">
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
          <ul className="flex items-center justify-center gap-1 h-12">
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
                          "block aspect-square h-10 w-10 rounded border-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing",
                          image.id === selectedImageId 
                            ? "border-blue-500 ring-2 ring-blue-300 scale-110" 
                            : "border-gray-300 hover:border-gray-400"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.dataUrl}
                          className="h-full w-full object-cover pointer-events-none"
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
            <div className="aspect-square h-10 w-10 rounded border-2 border-blue-500 overflow-hidden shadow-lg rotate-6 transform opacity-90">
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
    <div className="rounded border-2 border-black p-2 bg-white shadow-lg opacity-90 rotate-3 transform">
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
