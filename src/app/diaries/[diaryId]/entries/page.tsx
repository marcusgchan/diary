import { HydrateClient } from "~/trpc/server";
import { Entries } from "./Entries";
import { Header } from "./Header";
import { api } from "~/trpc/server";

export default async function Page(props: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const params = await props.params;
  await api.diary.getEntry.prefetch({
    diaryId: Number(params.diaryId),
    entryId: Number(params.entryId),
  });
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid h-full min-h-0 flex-1 gap-2 sm:grid-cols-[220px_1fr]">
        <aside className="">
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <HydrateClient>
            <Entries />
          </HydrateClient>
        </aside>
      </div>
    </div>
  );
}
