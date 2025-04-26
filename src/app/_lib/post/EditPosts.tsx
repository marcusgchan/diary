"use client";
import { Images, Plus, Trash } from "lucide-react";
import { ChangeEvent, InputHTMLAttributes, useState } from "react";
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

export function EditPosts() {
  const [posts, setPosts] = useState<Post[]>([]);

  const [selectedPostForm, setSelectedPostForm] =
    useState<SelectedPostForm>(defaultFormValue);

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
          handleTitleChange={handleTitleChange}
          handleDescriptionChange={handleDescriptionChange}
          handleFilesChange={handleFilesChange}
          savePost={savePost}
        />
        <SortableContext items={posts.map((post) => ({ id: post.id }))}>
          <PostsAside posts={posts} />
        </SortableContext>
      </DndContext>
    </div>
  );
}

type SelectedPostView = {
  selectedPostForm: SelectedPostForm;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  savePost: (post: SelectedPostForm) => void;
};
function SelectedPostView({
  selectedPostForm,
  handleTitleChange,
  handleDescriptionChange,
  handleFilesChange,
  savePost,
}: SelectedPostView) {
  return (
    <div className="grid w-96 grid-cols-1 grid-rows-[2fr_auto_1fr] gap-2 rounded border-2 border-black p-2">
      <div className="relative">
        <div className="h-[200px] overflow-x-auto">
          <label className="absolute bottom-2 right-2 grid place-items-center">
            <Input
              type="file"
              onChange={handleFilesChange}
              multiple
              className="w-0 opacity-0 [grid-area:1/1]"
            />
            <Images className="[grid-area:1/1]" />
          </label>
          <ul className="flex gap-4">
            {selectedPostForm.images.map((image) => {
              return (
                <li
                  key={image.id}
                  className="flex-shrink-0 border-2 border-black"
                >
                  <img
                    className="aspect-[4/3] w-[300px] object-cover"
                    src={image.dataUrl}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <input
        placeholder="Title..."
        value={selectedPostForm.title}
        onChange={(e) => handleTitleChange(e.target.value)}
      />
      <textarea
        placeholder="Description..."
        className="resize-none"
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
