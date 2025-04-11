"use client";

import { useParams, useRouter } from "next/navigation";
import { PostsForm, PostsFormHandle } from "./PostsForm";
import { api } from "~/trpc/TrpcProvider";
import { useEffect, useRef } from "react";
import { RouterInputs } from "~/server/api/trpc";

type UpdatePostsMut = RouterInputs["diary"]["updatePosts"];

export function FormWrapper() {
  const params = useParams();
  const router = useRouter();

  const updatePostMut = api.diary.updatePosts.useMutation({
    onSuccess() {
      router.push(`/diaries/${params.diaryId}/entries/${params.entryId}/posts`);
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
        type="UPDATE"
      />
    );
  }

  if (isPending) {
    return "Loading...";
  }

  return "Something went wrong";
}
