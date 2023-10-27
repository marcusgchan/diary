"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "~/app/_components/ui/button";
import { api } from "~/trpc/client";

export function Header() {
  const params = useParams();
  const queryUtils = api.useContext();
  const router = useRouter();
  const addEntryMutation = api.diary.createEntry.useMutation({
    async onSuccess(data) {
      router.push(`./entries/${data.id}`);
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
    <header className="ml-auto">
      <Button onClick={addEntry}>Add Entry</Button>
    </header>
  );
}
