"use client";

import { Trash } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { cn } from "~/app/_utils/cx";
import { api } from "~/trpc/client";

export function Entries() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entriesQuery = api.diary.getEntries.useQuery(
    { diaryId: Number(diaryId) },
    {
      enabled: !!diaryId,
    },
  );
  return (
    <FetchResolver
      {...entriesQuery}
      loadingComponent={
        <ul className="flex flex-col gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton key={i} className="h-8 w-full" />
            </li>
          ))}
        </ul>
      }
    >
      {(data) => {
        return (
          <ul className="grid gap-1">
            {data.map((entry) => {
              return (
                <li key={entry.id}>
                  <Link
                    className={cn(
                      "flex justify-between rounded bg-secondary p-1",
                      entryId &&
                        Number(entryId) === entry.id &&
                        "bg-secondary/60",
                    )}
                    href={`/diaries/${entry.diaryId}/entries/${entry.id}`}
                  >
                    {entry.day}
                    {entryId && Number(entryId) === entry.id && (
                      <button>
                        <Trash />
                      </button>
                    )}
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
