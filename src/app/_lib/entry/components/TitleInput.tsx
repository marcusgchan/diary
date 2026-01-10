"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../../ui/skeleton";
import { useDebounce } from "../../shared/hooks/useDebounce";

export function TitleInput() {
  const api = useTRPC();
  const { diaryId, entryId } = useParams();

  const { data, isPending, isError } = useQuery(
    api.diary.getEntryTitle.queryOptions({
      entryId: Number(entryId),
    }),
  );
  const [title, setTitle] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const saveTitleMutation = useMutation(
    api.diary.updateTitle.mutationOptions({
      onSuccess(data) {
        queryClient.setQueryData(
          api.diary.getEntry.queryKey({
            diaryId: Number(diaryId),
            entryId: Number(entryId),
          }),
          (old) => {
            if (old) {
              return { ...old, title: data };
            }
            return old;
          },
        );

        queryClient.setQueryData(
          api.diary.getEntries.queryKey({ diaryId: Number(diaryId) }),
          (entries) => {
            if (!entries) {
              return undefined;
            }

            return entries.map((entry) => {
              if (entry.id === Number(entryId)) {
                return { ...entry, title: data };
              }

              return entry;
            });
          },
        );

        queryClient.setQueryData(
          api.diary.getEntryTitle.queryKey({ entryId: Number(entryId) }),
          data,
        );
      },
    }),
  );

  const saveToBackend = useDebounce(
    (data: string) => {
      saveTitleMutation.mutate({
        diaryId: Number(diaryId),
        entryId: Number(entryId),
        title: data,
      });
    },
    { waitInMs: 500 },
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setTitle(title);
    saveToBackend(title);
  };

  if (isError) {
    return <p>Could not fetch title</p>;
  }

  if (isPending) {
    return <Skeleton className="w-20" />;
  }

  return (
    <input
      className="bg-transparent text-2xl"
      value={title ?? data}
      onChange={handleTitleChange}
      placeholder="Enter a title..."
    />
  );
}
