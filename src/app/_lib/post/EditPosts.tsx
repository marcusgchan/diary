"use client";
import { Images, Plus, Trash } from "lucide-react";
import {
  type ChangeEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
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

type Post = {
  id: string;
  title: string;
  description: string;
  images: {
    id: string;
    dataUrl: string;
    name: string;
    type: string;
    size: number;
  }[];
};

type SelectedPostForm = Pick<Post, "title" | "description" | "images"> & {
  id?: string;
};

const defaultFormValue = {
  images: [],
  title: "",
  description: "",
};

type ScrollData =
  | { type: "STATIONARY" }
  | {
      type: "MOVING";
      by: "USER";
      startingScrollLeftPosition: number;
      currentScrolledDistance: number;
    }
  | { type: "MOVING"; by: "COMPUTER" };

function useScrollDetector(
  images: Post["images"],
  selectedImageId: Post["images"][number]["id"] | undefined,
  onShouldScroll: (nextImageId: Post["images"][number]["id"]) => void,
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDataRef = useRef<ScrollData>({ type: "STATIONARY" });

  useEffect(() => {
    function determineNextImageId(delta: number): Post["images"][number]["id"] {
      if (delta > 40) {
        const currentPostIndex = images.findIndex(
          (image) => image.id === selectedImageId,
        );
        if (!(currentPostIndex < images.length - 1)) {
          return selectedImageId!;
        }

        return images[currentPostIndex + 1]!.id;
      }
      if (delta < -40) {
        const currentPostIndex = images.findIndex(
          (post) => post.id === selectedImageId,
        );
        if (currentPostIndex === 0) {
          return selectedImageId!;
        }
        return images[currentPostIndex - 1]!.id;
      }

      return selectedImageId!;
    }

    function onScroll() {
      if (scrollContainerRef.current === null) {
        throw new Error(
          "Initialize scrollContainerRef to capture scroll events",
        );
      }

      if (
        scrollDataRef.current.type === "MOVING" &&
        scrollDataRef.current.by === "COMPUTER"
      ) {
        return;
      }

      if (scrollDataRef.current.type === "MOVING") {
        const { startingScrollLeftPosition } = scrollDataRef.current;
        const delta =
          scrollContainerRef.current.scrollLeft - startingScrollLeftPosition;
        if (Math.abs(delta) > 40) {
          const nextImageId = determineNextImageId(delta);
          onShouldScroll(nextImageId);
          scrollDataRef.current = { type: "MOVING", by: "COMPUTER" };
        } else {
          scrollDataRef.current.currentScrolledDistance += delta;
        }

        return;
      }

      const scrollLeft = scrollContainerRef.current.scrollLeft;
      scrollDataRef.current = {
        type: "MOVING",
        by: "USER",
        currentScrolledDistance: scrollLeft,
        startingScrollLeftPosition: scrollLeft,
      };
    }

    function onScrollEnd() {
      if (selectedImageId === undefined) {
        throw new Error("Should not scroll while not image selected");
      }

      if (
        scrollDataRef.current.type === "MOVING" &&
        scrollDataRef.current.by === "USER"
      ) {
        onShouldScroll(selectedImageId);
      }
      scrollDataRef.current = { type: "STATIONARY" };
    }

    if (!scrollContainerRef.current) {
      return;
    }

    const controller = new AbortController();
    const element = scrollContainerRef.current;
    element.addEventListener("scroll", onScroll, {
      signal: controller.signal,
    });
    element.addEventListener("scrollend", onScrollEnd, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [scrollContainerRef, images, selectedImageId, onShouldScroll]);

  return scrollContainerRef;
}

function usePostViewController() {
  const imagesRef =
    useRef<Map<Post["images"][number]["id"], HTMLLIElement>>(null);

  function setRef(postId: Post["id"], el: HTMLLIElement | null) {
    const map = getMap();
    map.set(postId, el!);

    return () => {
      map.delete(postId);
    };
  }

  function scrollToPost(id: Post["id"]) {
    const map = getMap();
    const el = map.get(id);
    if (!el) {
      return;
    }

    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  function getMap() {
    if (imagesRef.current === null) {
      imagesRef.current = new Map<Post["id"], HTMLLIElement>();
      return imagesRef.current;
    }

    return imagesRef.current;
  }

  return { setRef, scrollToPost };
}

export function EditPosts() {
  const [posts, setPosts] = useState<Post[]>([]);

  const [selectedPostForm, setSelectedPostForm] =
    useState<SelectedPostForm>(defaultFormValue);
  const [selectedImageId, setSelectedImageId] =
    useState<Post["images"][number]["id"]>();

  const { scrollToPost, setRef } = usePostViewController();
  const scrollContainerRef = useScrollDetector(
    selectedPostForm.images,
    selectedImageId,
    (nextImageId) => {
      scrollToPost(nextImageId);
      setSelectedImageId(nextImageId);
    },
  );

  async function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) {
      return;
    }

    if (files.length === 0) {
      // Toast
      return;
    }

    const success: SelectedPostForm["images"] = [];
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
    setSelectedPostForm((prev) => ({
      ...prev,
      images: [...prev.images, ...success],
    }));
    if (success.length > 0) {
      setSelectedImageId(success[0]!.id);
    }
  }
  function handleTitleChange(value: string) {
    setSelectedPostForm({
      ...selectedPostForm,
      title: value,
    });
  }
  function handleDescriptionChange(value: string) {
    setSelectedPostForm({
      ...selectedPostForm,
      description: value,
    });
  }

  function savePost(postData: SelectedPostForm) {
    if (postData.id) {
      const updatedPosts = posts.map((post) => {
        if (post.id !== postData.id) {
          return post;
        }

        return postData as Post;
      });
      setPosts(updatedPosts);
      return;
    }

    const updatedPost = { id: crypto.randomUUID(), ...postData };
    setPosts([...posts, updatedPost]);
    setSelectedPostForm(defaultFormValue);
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
          selectedPostForm={selectedPostForm}
          selectedImageId={selectedImageId}
          handleTitleChange={handleTitleChange}
          handleDescriptionChange={handleDescriptionChange}
          handleFilesChange={handleFilesChange}
          savePost={savePost}
          setRef={setRef}
          scrollContainerRef={scrollContainerRef}
        />
        <SortableContext items={posts.map((post) => ({ id: post.id }))}>
          <PostsAside posts={posts} />
        </SortableContext>
      </DndContext>
    </div>
  );
}

type SelectedPostViewProps = {
  selectedPostForm: SelectedPostForm;
  selectedImageId: Post["images"][number]["id"] | undefined;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  savePost: (post: SelectedPostForm) => void;
  setRef: (postId: Post["id"], el: HTMLLIElement | null) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

function SelectedPostView({
  selectedPostForm,
  selectedImageId,
  handleTitleChange,
  handleDescriptionChange,
  handleFilesChange,
  savePost,
  setRef,
  scrollContainerRef,
}: SelectedPostViewProps) {
  return (
    <div className="flex w-80 flex-col gap-2 rounded border-2 border-black p-2">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="hide-scrollbar h-[200px] overflow-x-auto"
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
                <li
                  ref={(ref) => {
                    setRef(image.id, ref);
                  }}
                  key={image.id}
                  className="w-full flex-shrink-0 flex-grow border-2 border-black"
                >
                  <img
                    className="h-full w-full object-cover"
                    src={image.dataUrl}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <ul className="flex items-center justify-center gap-1">
        {selectedPostForm.images.map((image) => {
          return (
            <li key={image.id} className="">
              <button
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
        <Button className="ml-auto" variant="secondary" type="button">
          Cancel
        </Button>
        <Button
          disabled={selectedPostForm.images.length === 0}
          onClick={() => savePost(selectedPostForm)}
          type="button"
          className="ml-2"
        >
          Save All
        </Button>
      </div>
    </div>
  );
}

type PostsAsideProps = { posts: Post[] };
function PostsAside({ posts }: PostsAsideProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant="outline">
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
                    onClick={() => console.log("clicked")}
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
                          <img
                            src={image.dataUrl}
                            className="inline-block h-full w-full object-cover"
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
