"use client";
import { useParams } from "next/navigation";
import { type GetPostImage } from "~/server/lib/types";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { useMemo } from "react";
import { usePosts } from "../contexts/PostsContext";
import { createPostSchema } from "~/server/lib/schema";
import { useToast } from "../../ui/use-toast";
import { PostListsSkeletion } from "./PostsListSkeleton";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Marker } from "../../map/components/Marker";

const Map = dynamic(() => import("../../map/components/Map"), { ssr: false });

export function Posts() {
  return (
    <section className="space-y-4 overflow-auto">
      <PostsList />
      <MapSection />
    </section>
  );
}

function MapSection() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const {
    data: images,
    isPending,
    isError,
  } = useQuery(api.diary.getImagesByEntryId.queryOptions({ entryId }));

  return (
    <Map>
      {images?.map((image) => {
        console.log({ image });
        return (
          <Marker
            key={image.id}
            latitude={image.lattitude}
            longitude={image.longitude}
          >
            <div>
              <img className="aspect-square h-[40px]" src={image.url} />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}

function PostsList() {
  const api = useTRPC();
  const params = useParams();
  const entryId = Number(params.entryId);

  const {
    data: posts,
    isError,
    isPending,
  } = useQuery(api.diary.getPosts.queryOptions({ entryId }));

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

  const queryClient = useQueryClient();
  const mutation = useMutation(
    api.diary.createPosts.mutationOptions({
      async onSuccess() {
        return queryClient.invalidateQueries(
          api.diary.getPosts.queryFilter({ entryId }),
        );
      },
    }),
  );
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

  if (isPending) {
    return <PostListsSkeletion />;
  }

  if (isError) {
    return "Something went wrong";
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

  return (
    <ul className="space-y-2">
      {posts.map((post) => {
        return (
          <li key={post.id} className="space-y-2">
            {post.title.length > 0 && <h3 className="text-lg">{post.title}</h3>}
            <ImageList images={post.images} />
            {post.description.length > 0 && <p>{post.description}</p>}
          </li>
        );
      })}
    </ul>
  );
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
    <img
      className="aspect-[4/3] w-[300px] object-cover"
      alt={image.name}
      src={image.url}
    />
  );
}
