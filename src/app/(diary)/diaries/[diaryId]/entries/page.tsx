import { Entries } from "~/app/_lib/entry/components/Entries";

export default function Page() {
  return (
    <div>
      <div className="hidden md:block">
        <p>No selected entry</p>
      </div>
      <div className="md:hidden">
        <Entries />
      </div>
    </div>
  );
}
