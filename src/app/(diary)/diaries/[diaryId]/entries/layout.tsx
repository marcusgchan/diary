import { Header } from "@/_lib/diary/components/Header";
import {
  SidebarProvider,
  EntrySidebar,
  SidebarLayout,
} from "~/app/_lib/entry/components/EntrySidebar";

export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <SidebarProvider>
        <SidebarLayout className="h-full min-h-0">
          <EntrySidebar />
          {children}
        </SidebarLayout>
      </SidebarProvider>
    </div>
  );
}
