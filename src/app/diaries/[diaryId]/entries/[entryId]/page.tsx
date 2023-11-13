"use client";

import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { api } from "~/trpc/client";
import { Editor } from "./Editor";
import { Skeleton } from "~/app/_components/ui/skeleton";

export default function Entry() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entryQuery = api.diary.getEntry.useQuery(
    {
      entryId: Number(entryId),
      diaryId: Number(diaryId),
    },
    {
      initialData: undefined,
    },
  );
  return (
    <FetchResolver
      {...entryQuery}
      loadingComponent={<Skeleton className="h-full w-full" />}
    >
      {(data) =>
        !data ? (
          <main>Doesn&#39;t exist</main>
        ) : (
          <main className="flex h-full flex-col gap-2">
            <h3 className="text-2xl">{data.day}</h3>
            <Editor initialEditorState={data.editorState} />
          </main>
        )
      }
    </FetchResolver>
  );
}
