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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableItem } from "../shared/SortableItem";
import { cn } from "../utils/cx";
import { postsReducer, initialState, type Post } from "./postsReducer";

function useScrollToPost(containerRef: RefObject<HTMLElement | null>) {
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  function scrollToPost(id: Post["id"]) {
    const el = document.querySelector(`[data-image-id="${id}"]`);
    if (!el) return;

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

  const selectedPost = state.posts.find((p) => p.id === state.selectedPostId)!;

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
    dispatch({ type: "START_EDITING", payload: post.id });
  }

  function handleSavePost() {
    dispatch({ type: "SAVE_POST" });
  }

  function handleCancelEdit() {
    dispatch({ type: "CANCEL_EDITING" });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 2000,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <div className="flex gap-4">
      <DndContext sensors={sensors}>
        <SelectedPostView
          isScrollingProgrammatically={isScrollingProgrammatically}
          onImageIntersect={onImageIntersect}
          selectedPostForm={selectedPost}
          selectedImageId={state.selectedImageId}
          setSelectedImageId={handleImageSelect}
          handleTitleChange={handleTitleChange}
          handleDescriptionChange={handleDescriptionChange}
          handleFilesChange={handleFilesChange}
          onSave={handleSavePost}
          onCancel={handleCancelEdit}
          scrollContainerRef={scrollContainerRef}
        />
        <SortableContext items={state.posts.map((post) => ({ id: post.id }))}>
          <PostsAside
            posts={state.posts.filter((p) => p.images.length > 0)}
            onNewPost={handleStartNewPost}
            onEditPost={handleEditPost}
          />
        </SortableContext>
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
  onCancel: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
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
  onCancel,
  scrollContainerRef,
}: SelectedPostViewProps) {
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
      <ul className="flex items-center justify-center gap-1 h-4">
        {selectedPostForm.images.map((image: Post["images"][number]) => {
          return (
            <li key={image.id} className="">
              <button
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={cn(
                  "block aspect-square min-h-0 w-2 rounded-full bg-blue-300",
                  image.id === selectedImageId && "aspect-[4/3] w-3",
                )}
              ></button>
            </li>
          );
        })}
      </ul>
      <input
        placeholder="Title..."
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
        <Button variant="destructive" type="button">
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
                    style={props.style}
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
