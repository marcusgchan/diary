"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Skeleton } from "~/app/_lib/ui/skeleton";
import { api } from "~/trpc/TrpcProvider";

const Editor = dynamic(
  () => import("@/_lib/editor/Editor").then((c) => ({ default: c.Editor })),
  { ssr: false },
);

export function DiaryEntry() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entryQuery = api.diary.getEntry.useQuery(
    {
      entryId: Number(entryId),
      diaryId: Number(diaryId),
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (entryQuery.isPending) {
    return (
      <main className="flex h-full flex-col gap-2">
        <Skeleton className="h-full w-full" />
      </main>
    );
  }

  if (entryQuery.isError) {
    <p>Something went wrong</p>;
  }

  if (entryQuery.data) {
    return <Editor initialEditorState={entryQuery.data.editorState} />;
  }

  return <p>Doesn&#39;t exist</p>;
}
