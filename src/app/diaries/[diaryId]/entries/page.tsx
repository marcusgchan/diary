import { Entries } from "./Entries";
import { Header } from "./Header";

export default function Page() {
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid h-full min-h-0 flex-1 gap-2 sm:grid-cols-[220px_1fr]">
        <aside className="">
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <Entries />
        </aside>
        <div className="h-full min-h-0"></div>
      </div>
    </div>
  );
}
