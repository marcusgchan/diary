"use client";

import { useParams } from "next/navigation";
import { type GetPostImage } from "~/server/features/diary/types";
import { api } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { useMemo } from "react";
import { usePosts } from "../contexts/PostsContext";
import { createPostSchema } from "~/server/features/diary/schema";
import { useToast } from "../../ui/use-toast";

export function Posts() {
  return (
    <section className="overflow-auto">
      <PostsList />
    </section>
  );
}

function PostsList() {
  const params = useParams();
  const entryId = Number(params.entryId);

  const { data: posts, isError } = api.diary.getPosts.useQuery({ entryId });

  const { state } = usePosts();
  const disableCreate = useMemo(() => {
    if (!state.posts) {
      return true;
    }

    const hasAtLeastOnePostWithNonLoadedImage = state.posts.some((post) => {
      return (
        post.images.length === 0 ||
        post.images.some((image) => image.type !== "loaded")
      );
    });
    if (hasAtLeastOnePostWithNonLoadedImage) {
      return true;
    }

    return false;
  }, [state.posts]);

  const queryUtils = api.useUtils();
  const mutation = api.diary.createPosts.useMutation({
    async onSuccess() {
      return queryUtils.diary.getPosts.invalidate({ entryId });
    },
  });
  const { toast } = useToast();
  function handleCreate() {
    const parseResult = createPostSchema.safeParse({
      entryId: entryId,
      posts: state.posts,
    });
    if (!parseResult.success) {
      toast({ title: "Unable to create toast" });
      return;
    }
    mutation.mutate(parseResult.data);
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-2">
        <EditPosts />
        <Button
          onClick={() => handleCreate()}
          disabled={disableCreate}
          type="button"
        >
          Create Post
        </Button>
      </div>
    );
  }

  if (posts) {
    return (
      <ul className="space-y-2">
        {posts.map((post) => {
          return (
            <li key={post.id} className="space-y-2">
              {post.title.length > 0 && (
                <h3 className="text-lg">{post.title}</h3>
              )}
              <ImageList images={post.images} />
              {post.description.length > 0 && <p>{post.description}</p>}
            </li>
          );
        })}
      </ul>
    );
  }

  if (isError) {
    return "Something went wrong";
  }

  return "Loading...";
}

type ImageListProps = { images: GetPostImage[] };

function ImageList({ images }: ImageListProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {images.map((image) => (
        <li key={image.id} className="flex-shrink-0">
          <ImageLoader image={image} />
        </li>
      ))}
    </ul>
  );
}

type ImageLoaderProps = {
  image: GetPostImage;
};

function ImageLoader({ image }: ImageLoaderProps) {
  if (image.type === "error") {
    return <p className="aspect-[4/3] w-[300px]">Unable to load image </p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="aspect-[4/3] w-[300px]" alt={image.name} src={image.url} />
  );
}
