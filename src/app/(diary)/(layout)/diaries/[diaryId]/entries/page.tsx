import { Entries } from "~/app/_lib/entry/components/Entries";
import { SidebarTrigger } from "~/app/_lib/entry/components/EntrySidebar";

export default function Page() {
  return (
    <div>
      <div className="hidden md:block">
        <SidebarTrigger />
        <p>No selected entry</p>
      </div>
      <div className="md:hidden">
        <Entries />
      </div>
    </div>
  );
}
