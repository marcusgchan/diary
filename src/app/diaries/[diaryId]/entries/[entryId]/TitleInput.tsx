"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RouterOutputs } from "~/server/api/trpc";
import { api } from "~/trpc/TrpcProvider";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export function TitleInput(props: { title: Entry["title"] }) {
  const { diaryId, entryId } = useParams();
  const [title, setTitle] = useState(props.title ?? "");
  const queryUtils = api.useUtils();
  const saveTitleMutation = api.diary.updateTitle.useMutation({
    onSuccess(data) {
      queryUtils.diary.getEntry.setData(
        { diaryId: Number(diaryId), entryId: Number(entryId) },
        (old) => {
          if (old) {
            return { ...old, title: data };
          }
          return old;
        },
      );
    },
  });
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setTitle(title);
    saveTitleMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      title: title,
    });
  }
  return (
    <input
      className="bg-transparent text-2xl"
      value={title}
      onChange={handleTitleChange}
      placeholder="Enter a title..."
    />
  );
}
