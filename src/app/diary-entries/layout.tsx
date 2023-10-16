import { Button } from "@/components/ui/button";

export default function DiaryEntriesPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header>
        <nav className="flex justify-end">
          <Button type="button">Create Entry</Button>
        </nav>
      </header>
      <main className="grid flex-1 grid-cols-[200px_1fr] p-4">
        <aside className="border-r-2 border-x-red-400 p-4">
          <h2 className="text-2xl">Diary Entries</h2>
          <ul>
            <li>2023-10-16</li>
            <li>2023-10-15</li>
            <li>2023-10-14</li>
            <li>2023-10-13</li>
          </ul>
        </aside>
        <section className="p-4">{children}</section>
      </main>
    </div>
  );
}
