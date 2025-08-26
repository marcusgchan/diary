"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Skeleton } from "../../ui/skeleton";
import { cn } from "../../utils/cx";
import Link from "next/link";

export function DiaryList() {
  const api = useTRPC();
  const { isLoading, isError, data } = useQuery(
    api.diary.getDiaries.queryOptions(),
  );

  if (isLoading) {
    return Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="aspect-[3/4]" />
    ));
  }

  if (isError) {
    return <p>Something went wrong!</p>;
  }

  const diaries = data ?? [];
  return diaries.map(({ id, name }) => (
    <li key={id} className="h-full">
      <Link
        href={`${"/diaries"}/${id.toString()}/entries`}
        className={cn(
          "grid aspect-[3/4] w-full place-items-center rounded-md border-2 border-primary p-4",
          isOptimistic(id) && "opacity-70",
        )}
      >
        {name}
      </Link>
    </li>
  ));
}

function isOptimistic(id: string | number) {
  return typeof id === "string";
}
