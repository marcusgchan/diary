"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { api } from "~/trpc/TrpcProvider";

const Editor = dynamic(
  () => import("./Editor").then((c) => ({ default: c.Editor })),
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
  return (
    <FetchResolver
      {...entryQuery}
      loadingComponent={
        <main className="flex h-full flex-col gap-2">
          <Skeleton className="h-full w-full" />
        </main>
      }
    >
      {(data) => {
        return !data ? (
          <div>Doesn&#39;t exist</div>
        ) : (
          <Editor initialEditorState={data.editorState} />
        );
      }}
    </FetchResolver>
  );
}
