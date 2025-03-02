"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RouterOutputs } from "~/server/api/trpc";
import { api } from "~/trpc/TrpcProvider";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export function TitleInput() {
  const { diaryId, entryId } = useParams();

  const { data } = api.diary.getEntryTitle.useQuery({
    entryId: Number(entryId),
  });
  const [title, setTitle] = useState(data ?? "");
  useEffect(() => {
    if (data) {
      setTitle(data);
    }
  }, [data]);

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

      queryUtils.diary.getEntryTitle.setData(
        { entryId: Number(entryId) },
        data,
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
