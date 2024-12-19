"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function EntryMapHeader() {
  const { diaryId, entryId } = useParams();
  return (
    <div className="flex items-center justify-between">
      <Link href={`/diaries/${diaryId}/entries/${entryId}/map/edit`}>Edit</Link>
    </div>
  );
}
