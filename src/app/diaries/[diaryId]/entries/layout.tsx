import { Entries } from "./Entries";
import { Header } from "./Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <main className="grid flex-1 grid-cols-[200px_1fr]">
        <aside className="border-r-2 border-x-red-400">
          <h2 className="text-2xl">Diary Entries</h2>
          <Entries />
        </aside>
        <div className="">{children}</div>
      </main>
    </div>
  );
}
