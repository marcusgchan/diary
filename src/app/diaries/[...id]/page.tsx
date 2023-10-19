"use client";

import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { api } from "~/app/_trpc/api";

export default function Entry() {
  const searchParams = useSearchParams();
  const createEntryMutation = api.diary.createEntry.useMutation();
  const diaryId = searchParams.get("id");
  const createEntry = () => {
    if (diaryId === null) {
      console.error("No diary id");
      return;
    }
    createEntryMutation.mutate({ diaryId: Number(diaryId) });
  };
  return (
    <div className="flex h-full flex-col gap-4">
      <header>
        <nav className="flex justify-between">
          <Button
            type="button"
            disabled={diaryId === null}
            onClick={createEntry}
          >
            Create Entry
          </Button>
        </nav>
      </header>
      <main className="grid flex-1 grid-cols-[200px_1fr]">
        <aside className="border-r-2 border-x-red-400">
          <h2 className="text-2xl">Diary Entries</h2>
          <ul>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
          </ul>
        </aside>
        <section className=""></section>
      </main>
    </div>
  );
}
