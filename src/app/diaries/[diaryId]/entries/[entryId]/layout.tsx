import { db } from "~/server/db";
import { Entries } from "../Entries";
import { Header } from "../Header";
import { DatePicker } from "./DatePicker";
import { TitleInput } from "./TitleInput";
import { getEntryTitleDayById } from "~/server/api/features/diary/service";
import { getServerAuthSession } from "~/server/auth";
import { EntryTab } from "./EntryTab";

export default async function EntryLayout({
  params: { diaryId, entryId },
  children,
}: {
  params: { diaryId: string; entryId: string };
  children: React.ReactNode;
}) {
  const auth = await getServerAuthSession();

  const data = await getEntryTitleDayById({
    db,
    userId: auth?.user.id!,
    diaryId: Number(diaryId),
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
            {data ? (
              <>
                <EntryTab />
                {children}
              </>
            ) : (
              <p>not exist</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
