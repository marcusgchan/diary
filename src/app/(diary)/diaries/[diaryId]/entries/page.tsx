import { Entries } from "~/app/_lib/entry/components/Entries";

export default function Page() {
  return (
    <div>
      <div className="hidden md:block">
        <h3 className="mb-2 text-2xl">Diary Entries</h3>
        <p>No selected entry</p>
      </div>
      <div className="md:hidden">
        <Entries />
      </div>
    </div>
  );
}
