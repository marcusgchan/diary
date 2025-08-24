"use client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "~/app/_lib/ui/button";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export function Header() {
  const api = useTRPC();
  const params = useParams();
  const diaryId = params.diaryId as string;
  const queryClient = useQueryClient();
  const router = useRouter();
  const goToEditDiary = () => router.push(`/diaries/${diaryId}/edit`);
  const { data: diary } = useQuery(
    api.diary.getDiary.queryOptions(
      {
        diaryId: Number(params.diaryId),
      },
      { enabled: !!params.diaryId, refetchOnWindowFocus: false },
    ),
  );
  const addEntryMutation = useMutation(
    api.diary.createEntry.mutationOptions({
      async onSuccess(data) {
        router.push(`/diaries/${diaryId}/entries/${data.id}`);
        await queryClient.invalidateQueries(
          api.diary.getEntries.queryFilter({
            diaryId: Number(params.diaryId),
          }),
        );
      },
    }),
  );
  const addEntry = () => {
    addEntryMutation.mutate({
      day: new Date().toLocaleDateString("en-CA"),
      diaryId: Number(params.diaryId),
    });
  };
  return (
    <header className="flex justify-between gap-2">
      <h2 className="text-xl">{diary?.name ?? ""}</h2>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={goToEditDiary}>
          Edit Diary
        </Button>
        <Button onClick={addEntry}>Add Entry</Button>
      </div>
    </header>
  );
}
