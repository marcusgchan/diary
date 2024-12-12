"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "~/app/_utils/cx";

export function EntryTab() {
  const { diaryId, entryId } = useParams();
  const path = usePathname();
  function currentPath(target: string) {
    return path.includes(target);
  }
  return (
    <ul className="inline-flex items-start self-start rounded bg-muted p-1">
      <li>
        <Link
          href={`/diaries/${diaryId}/entries/${entryId}/map`}
          className={cn(
            "block whitespace-nowrap rounded bg-muted px-4 py-1",
            currentPath("map") && "bg-black",
          )}
        >
          Image Diary
        </Link>
      </li>
      <li>
        <Link
          href={`/diaries/${diaryId}/entries/${entryId}/journal`}
          className={cn(
            "block whitespace-nowrap rounded bg-muted px-4 py-1",
            currentPath("journal") && "bg-black",
          )}
        >
          Text Diary
        </Link>
      </li>
    </ul>
  );
}
