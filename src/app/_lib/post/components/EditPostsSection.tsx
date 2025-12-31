"use client";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { EditPostsLoading } from "./EditPostsLoading";
import { usePosts } from "../contexts/PostsContext";
import { updatePostSchema } from "~/server/lib/schema";
import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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

  function handleUpdate() {
    const moreThanOneImage = state.posts.every(
      (post) => post.images.length > 0,
    );

    if (!moreThanOneImage) {
      toast.error("There is a post with an empty image");
      return;
    }

    // Filter out location fields when they're null/undefined
    // Only include location fields when all three are present
    const postsToSend = state.posts.map((post) => {
      const { address, longitude, latitude, ...rest } = post;
      const hasCompleteLocation =
        address !== null &&
        address !== undefined &&
        longitude !== null &&
        longitude !== undefined &&
        latitude !== null &&
        latitude !== undefined;

      return hasCompleteLocation
        ? { ...rest, address, longitude, latitude }
        : rest;
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
    <>
      <EditPosts />
      <div className="space-x-2">
        <Button
          type="button"
          variant="destructive"
          onClick={() => handleBack()}
        >
          Back
        </Button>
        <Button type="button" onClick={() => handleUpdate()}>
          Edit Posts
        </Button>
      </div>
    </>
  );
}
