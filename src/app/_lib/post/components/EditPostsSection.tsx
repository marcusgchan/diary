"use client";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { EditPostsLoading } from "./EditPostsLoading";
import { usePosts } from "../contexts/PostsContext";
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
          <Button type="button" onClick={() => handleUpdate()}>
            Save
          </Button>
        </div>
      }
    />
  );
}
