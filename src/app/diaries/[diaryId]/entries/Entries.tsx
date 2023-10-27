"use client";

import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { api } from "~/trpc/client";

export function Entries() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entriesQuery = api.diary.getEntries.useQuery(
    { diaryId: Number(diaryId) },
    {
      enabled: !!diaryId,
    },
  );
  return (
    <FetchResolver {...entriesQuery}>
      {(data) => {
        return (
          <ul>
            {data.map((entry) => {
              return <li key={entry.id}>{entry.day}</li>;
            })}
          </ul>
        );
      }}
    </FetchResolver>
  );
}
