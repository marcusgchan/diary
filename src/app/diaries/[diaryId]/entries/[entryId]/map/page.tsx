import { RouterOutputs } from "~/server/api/trpc";
import EntryMapHeader from "./EntryMapHeader";
import { EditMapForm } from "./edit/EditMapForm";
import { Book } from "./Book";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export default async function Entry() {
  return <EntryImages />;
}

function EntryImages() {
  return (
    <div>
      <EntryMapHeader />
      <Book />
    </div>
  );
}

function Map() {
  return (
    <div>
      <h4 className="mb-2 text-xl">Map</h4>
      <div className="aspect-square w-[400px] bg-gray-50"></div>
    </div>
  );
}
