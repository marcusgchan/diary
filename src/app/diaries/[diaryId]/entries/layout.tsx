import { Header } from "./Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <main className="grid flex-1 grid-cols-[200px_1fr]">
        <aside className="border-r-2 border-x-red-400">
          <h2 className="text-2xl">Diary Entries</h2>
          <ul>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
            <li className="px-2 py-4">2023-10-16</li>
          </ul>
        </aside>
        <section className="">{children}</section>
      </main>
    </div>
  );
}
