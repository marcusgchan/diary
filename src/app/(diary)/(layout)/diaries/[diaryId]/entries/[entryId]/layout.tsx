import { DatePicker } from "@/_lib/entry/components/DatePicker";
import { TitleInput } from "@/_lib/entry/components/TitleInput";
import { EntryTab } from "@/_lib/entry/components/EntryTab";
import { SidebarTrigger } from "~/app/_lib/entry/components/EntrySidebar";

export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex gap-2">
        <SidebarTrigger />
        <TitleInput />
      </div>
      <DatePicker />
      <div className="flex items-center justify-between">
        <EntryTab />
      </div>
      {children}
    </div>
  );
}
