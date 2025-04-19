"use client";

import { useParams, useRouter } from "next/navigation";
import { PostsForm } from "../post/PostsForm";
import type { PostsFormHandle } from "../post/PostsForm";
import { api } from "~/trpc/TrpcProvider";
import { useEffect, useRef } from "react";
import type { RouterInputs } from "~/server/trpc";

type UpdatePostsMut = RouterInputs["diary"]["updatePosts"];

export function FormWrapper() {
  const params = useParams();
  const diaryId = params.diaryId as string;
  const entryId = params.entryId as string;
  const router = useRouter();

  const updatePostMut = api.diary.updatePosts.useMutation({
    onSuccess() {
      router.push(`/diaries/${diaryId}/entries/${entryId}/posts`);
    },
  });
  function updatePost(data: UpdatePostsMut) {
    updatePostMut.mutate(data);
  }

  const { data: posts, isPending } = api.diary.getPostsForForm.useQuery({
    entryId: Number(params.entryId),
  });
  const formRef = useRef<PostsFormHandle>(null);

  useEffect(() => {
    if (posts) {
      formRef.current?.reset(posts);
    }
  }, [posts]);

  if (posts) {
    return (
      <PostsForm
        ref={formRef}
        diaryId={Number(params.diaryId)}
        entryId={Number(params.entryId)}
        mutate={updatePost}
      />
    );
  }

  if (isPending) {
    return "Loading...";
  }

  return "Something went wrong";
}
