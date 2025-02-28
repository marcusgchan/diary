"use client";

import { useParams } from "next/navigation";
import { PostsForm, PostsFormHandle } from "./PostsForm";
import { api } from "~/trpc/TrpcProvider";
import { useEffect, useRef } from "react";
import { TitleInput } from "../../TitleInput";
import { DatePicker } from "../../DatePicker";

export function FormWrapper() {
  const params = useParams();

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
      <section className="grid gap-3">
        <TitleInput />
        <DatePicker />
        <PostsForm
          ref={formRef}
          diaryId={Number(params.diaryId)}
          entryId={Number(params.entryId)}
        />
      </section>
    );
  }

  if (isPending) {
    return "Loading...";
  }

  return "Something went wrong";
}
