"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "~/app/_components/ui/button";
import { api } from "~/trpc/client";

export function Header() {
  const params = useParams();
  const queryUtils = api.useContext();
  const router = useRouter();
  const goToEditDiary = () => router.push(`/diaries/${params.diaryId}/edit`);
  const { data: diary } = api.diary.getDiary.useQuery(
    {
      diaryId: Number(params.diaryId),
    },
    { enabled: !!params.diaryId, refetchOnWindowFocus: false },
  );
  const addEntryMutation = api.diary.createEntry.useMutation({
    async onSuccess(data) {
      router.push(`/diaries/${params.diaryId}/entries/${data.id}`);
      await queryUtils.diary.getEntries.invalidate({
        diaryId: Number(params.diaryId),
      });
    },
  });
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
