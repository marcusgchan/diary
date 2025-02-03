import { api, HydrateClient } from "~/trpc/server";
import { PostsSection } from "./Posts";

export default async function Entry({
  params: { entryId },
}: {
  params: { diaryId: string; entryId: string };
}) {
  await api.diary.getEntryMap.prefetch({
    entryId: Number(entryId),
  });
  await api.diary.getEntryTitle.prefetch({
    entryId: Number(entryId),
  });
  await api.diary.getEntryDay.prefetch({
    entryId: Number(entryId),
  });

  return (
    <HydrateClient>
      <PostsSection />
    </HydrateClient>
  );
}
