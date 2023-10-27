"use client";

import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { api } from "~/trpc/client";

export default function Entry() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entryQuery = api.diary.getEntry.useQuery({
    entryId: Number(entryId),
    diaryId: Number(diaryId),
  });
  return (
    <FetchResolver {...entryQuery}>
      {(data) => (!data ? <main>Doesn&#39;t exist</main> : <main></main>)}
    </FetchResolver>
  );
}
