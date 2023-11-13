import { Entries } from "./Entries";
import { Header } from "./Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid flex-1 grid-cols-[200px_1fr] gap-2">
        <aside>
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <Entries />
        </aside>
        <div className="">{children}</div>
      </div>
    </div>
  );
}
