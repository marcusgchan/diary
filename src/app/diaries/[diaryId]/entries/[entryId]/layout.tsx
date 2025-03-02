import { api } from "~/trpc/server";
import { Entries } from "../Entries";
import { Header } from "../Header";
import { DatePicker } from "./DatePicker";
import { TitleInput } from "./TitleInput";
import { EntryTab } from "./EntryTab";
import { EditPostsButton } from "./EditPostsButton";

export default async function EntryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { diaryId: string; entryId: string };
}) {
  const { entryId } = params;

  await api.diary.getEntryTitle.prefetch({
    entryId: Number(entryId),
  });
  await api.diary.getEntryDay.prefetch({
    entryId: Number(entryId),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid h-full min-h-0 flex-1 gap-2 sm:grid-cols-[220px_1fr]">
        <aside className="hidden sm:block">
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <Entries />
        </aside>
        <div className="h-full min-h-0 min-w-0">
          <main className="flex h-full flex-col gap-2">
            <TitleInput />
            <DatePicker />
            <div className="flex items-center justify-between">
              <EntryTab />
              <EditPostsButton />
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
