"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "~/app/_utils/cx";

export function EntryTab() {
  const params = useParams();
  const diaryId = params.diaryId as string;
  const entryId = params.entryId as string;
  const path = usePathname();
  function currentPath(target: string) {
    return path.includes(target);
  }
  return (
    <ul className="inline-flex items-start self-start rounded bg-muted p-1">
      <li>
        <Link
          href={`/diaries/${diaryId}/entries/${entryId}/posts`}
          className={cn(
            "block whitespace-nowrap rounded px-4 py-1 text-foreground",
            currentPath("/posts") && "bg-background",
          )}
        >
          Map Entry
        </Link>
      </li>
      <li>
        <Link
          href={`/diaries/${diaryId}/entries/${entryId}/journal`}
          className={cn(
            "block whitespace-nowrap rounded px-4 py-1 text-foreground",
            currentPath("/journal") && "bg-background",
          )}
        >
          Journal
        </Link>
      </li>
    </ul>
  );
}
