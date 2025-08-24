"use client";;
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import { usePosts } from "../contexts/PostsContext";
import { updatePostSchema } from "~/server/lib/schema";
import { useParams, useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";

export function EditPostsSection() {
  const api = useTRPC();
  const router = useRouter();

  const params = useParams();
  const entryId = Number(params.entryId);

  const { state } = usePosts();
  const mutation = useMutation(api.diary.updatePosts.mutationOptions({
    onSuccess() {
      router.push("../");
    },
  }));

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
