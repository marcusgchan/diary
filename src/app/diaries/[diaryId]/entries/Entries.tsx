"use client";

import Link from "next/link";
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
              return (
                <li key={entry.id}>
                  <Link href={`/diaries/${entry.diaryId}/entries/${entry.id}`}>
                    {entry.day}
                  </Link>
                </li>
              );
            })}
          </ul>
        );
      }}
    </FetchResolver>
  );
}
