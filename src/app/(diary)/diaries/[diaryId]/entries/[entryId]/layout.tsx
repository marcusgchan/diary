import { Entries } from "@/_lib/entry/components/Entries";
import { Header } from "@/_lib/diary/components/Header";
import { DatePicker } from "@/_lib/entry/components/DatePicker";
import { TitleInput } from "@/_lib/entry/components/TitleInput";
import { EntryTab } from "@/_lib/entry/components/EntryTab";
import { Plus } from "lucide-react";

export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            </div>
            {children}
            <button
              className="fixed bottom-6 right-6 rounded-full bg-foreground p-3"
              type="button"
            >
              <Plus className="text-background" />
            </button>
          </main>
        </div>
      </div>
    </div>
  );
}
