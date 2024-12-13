import { RouterOutputs } from "~/server/api/trpc";
import EntryMapHeader from "./EntryMapHeader";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export default async function Entry() {
  return (
    <div className="flex flex-wrap gap-4">
      <EntryImages />
      <Map />
    </div>
  );
}

function EntryImages() {
  return (
    <div>
      <EntryMapHeader />
      <ul className="grid gap-4">
        <li>
          <article>
            <h5 className="mb-2 text-xl">Title</h5>
            <div className="aspect-square w-[400px] rounded bg-gray-50"></div>
            <p>the quick brown fox jumps over the lazy dog</p>
          </article>
        </li>
        <li>
          <article>
            <h5 className="mb-2 text-xl">Title</h5>
            <div className="aspect-square w-[400px] rounded bg-gray-50"></div>
            <p>the quick brown fox jumps over the lazy dog</p>
          </article>
        </li>
      </ul>
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
