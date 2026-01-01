"use client";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { EditPostsLoading } from "./EditPostsLoading";
import { usePosts } from "../contexts/PostsContext";
import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";

export function EditPostsSection() {
  const api = useTRPC();
  const router = useRouter();

  const params = useParams();
  const entryId = Number(params.entryId);

  const { state } = usePosts();
  const mutation = useMutation(
    api.diary.updatePosts.mutationOptions({
      onSuccess() {
        router.push("../");
      },
    }),
  );

  const { isPending } = useQuery(
    api.diary.getPostsForForm.queryOptions({ entryId }),
  );

  const isSaveDisabled = useMemo(() => {
    // Disable if mutation is pending
    if (mutation.isPending) {
      return true;
    }

    // Disable if there are no posts
    if (!state.posts || state.posts.length === 0) {
      return true;
    }

    // Disable if any post has no images uploaded
    const hasPostWithNoImages = state.posts.some(
      (post) => post.images.length === 0,
    );
    if (hasPostWithNoImages) {
      return true;
    }

    // Disable if any images are loading (not "loaded")
    const hasLoadingImages = state.posts.some((post) =>
      post.images.some((image) => image.type !== "loaded"),
    );

    return hasLoadingImages;
  }, [state.posts, mutation.isPending]);

  function handleUpdate() {
    const moreThanOneImage = state.posts.every(
      (post) => post.images.length > 0,
    );

    if (!moreThanOneImage) {
      toast.error("There is a post with an empty image");
      return;
    }

    // Include location only when it exists (all-or-nothing)
    const postsToSend = state.posts.map((post) => {
      const { location, ...rest } = post;
      return location ? { ...rest, location } : rest;
    });

    mutation.mutate({ entryId, posts: postsToSend });
  }

  function handleBack() {
    router.push("../");
  }

  if (isPending) {
    return <EditPostsLoading />;
  }

  return (
    <EditPosts
      footer={
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => handleBack()}>
            Back
          </Button>
          <Button
            type="button"
            onClick={() => handleUpdate()}
            disabled={isSaveDisabled}
          >
            Save
          </Button>
        </div>
      }
    />
  );
}
