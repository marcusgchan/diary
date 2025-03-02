"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export function EditPostsButton() {
  const path = usePathname();
  const params = useParams();

  const { diaryId, entryId } = params;

  function currentPath(target: string) {
    return path.includes(target);
  }

  if (!currentPath("/posts") || currentPath("/edit")) {
    return null;
  }

  return (
    <Link href={`/diaries/${diaryId}/entries/${entryId}/posts/edit`}>Edit</Link>
  );
}
