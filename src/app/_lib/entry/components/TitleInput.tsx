"use client";;
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export function TitleInput() {
  const api = useTRPC();
  const { diaryId, entryId } = useParams();

  const { data } = useQuery(api.diary.getEntryTitle.queryOptions({
    entryId: Number(entryId),
  }));
  const [title, setTitle] = useState(data ?? "");
  useEffect(() => {
    if (data) {
      setTitle(data);
    }
  }, [data]);

  const queryClient = useQueryClient();
  const saveTitleMutation = useMutation(api.diary.updateTitle.mutationOptions({
    onSuccess(data) {
      queryClient.setQueryData(
        api.diary.getEntry.queryKey({ diaryId: Number(diaryId), entryId: Number(entryId) }),
        (old) => {
          if (old) {
            return { ...old, title: data };
          }
          return old;
        }
      );

      queryClient.setQueryData(api.diary.getEntryTitle.queryKey({ entryId: Number(entryId) }), data);
    },
  }));
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
