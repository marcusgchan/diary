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

    mutation.mutate({ entryId, posts: state.posts });
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
