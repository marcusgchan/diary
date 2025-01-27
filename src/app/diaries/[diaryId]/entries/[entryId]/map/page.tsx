import { RouterOutputs } from "~/server/api/trpc";
import EntryMapHeader from "./EntryMapHeader";
import { cn } from "~/app/_utils/cx";
import { CSSProperties } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { PostsContent } from "./Posts";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export default async function Entry({
  params: { entryId },
}: {
  params: { diaryId: string; entryId: string };
}) {
  await api.diary.getEntryMap.prefetch({
    entryId: Number(entryId),
  });

  return (
    <div className="grid gap-2">
      <EntryMapHeader />
      <HydrateClient>
        <PostsContent />
      </HydrateClient>
    </div>
  );
}
