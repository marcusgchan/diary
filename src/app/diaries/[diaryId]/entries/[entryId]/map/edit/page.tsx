"use client";
import { PostsForm } from "./PostsForm";

export default function EditMapPage({
  params,
}: {
  params: { diaryId: string; entryId: string };
}) {
  return (
    <PostsForm
      diaryId={Number(params.diaryId)}
      entryId={Number(params.entryId)}
    />
  );
}
