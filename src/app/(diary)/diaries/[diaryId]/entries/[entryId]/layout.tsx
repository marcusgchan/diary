import { DatePicker } from "@/_lib/entry/components/DatePicker";
import { TitleInput } from "@/_lib/entry/components/TitleInput";
import { EntryTab } from "@/_lib/entry/components/EntryTab";

export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex h-full flex-col gap-2">
      <TitleInput />
      <DatePicker />
      <div className="flex items-center justify-between">
        <EntryTab />
      </div>
      {children}
    </main>
  );
}
