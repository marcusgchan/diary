import { Button } from "@/components/ui/button";

export default function DiaryEntriesPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header>
        <nav className="flex justify-between p-4">
          <h1 className="text-4xl">Diary</h1>
          <Button type="button">Create Entry</Button>
        </nav>
      </header>
      <main className="grid flex-1 grid-cols-[200px_1fr] p-4">
        <aside className="border-r-2 border-x-red-400 p-4">
          <h2 className="text-2xl">Diary Entries</h2>
          <ul>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
          </ul>
        </aside>
        <section className="p-4">{children}</section>
      </main>
    </div>
  );
}
