"use client";

import { api } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { usePosts } from "../contexts/PostsContext";
import { updatePostSchema } from "~/server/features/diary/schema";
import { useParams, useRouter } from "next/navigation";

export function EditPostsSection() {
  const router = useRouter();

  const params = useParams();
  const entryId = Number(params.entryId);

  const { state } = usePosts();
  const mutation = api.diary.updatePosts.useMutation({
    onSuccess() {
      router.push("../");
    },
  });

  function handleUpdate() {
    const parseResult = updatePostSchema.safeParse({
      entryId,
      posts: state.posts,
    });

    if (!parseResult.success) {
      return;
    }

    mutation.mutate(parseResult.data);
  }
  return (
    <>
      <EditPosts />
      <Button type="button" onClick={() => handleUpdate()}>
        Edit Posts
      </Button>
    </>
  );
}
