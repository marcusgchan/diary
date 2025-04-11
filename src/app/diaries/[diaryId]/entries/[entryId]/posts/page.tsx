import { api, HydrateClient } from "~/trpc/server";
import { PostsSection } from "./Posts";
import { Suspense } from "react";

export default async function Entry({
  params: { entryId },
}: {
  params: { diaryId: string; entryId: string };
}) {
  // Prefetch the data
  await api.diary.getEntryMap.prefetch({
    entryId: Number(entryId),
  });

  return (
    <Suspense fallback="Loading...">
      <HydrateClient>
        <PostsSection />
      </HydrateClient>
    </Suspense>
  );
}
