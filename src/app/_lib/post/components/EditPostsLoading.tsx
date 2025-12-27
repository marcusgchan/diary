"use client";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";

export function EditPostsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-2 rounded-xl bg-card p-6 text-card-foreground">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between self-stretch">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-9 w-14 rounded-md" />
      </div>

      {/* Posts Selection Carousel Skeleton */}
      <div className="relative">
        <ul className="hide-scrollbar relative flex snap-x snap-mandatory items-center justify-center gap-2 overflow-x-auto rounded px-7 py-2">
          <li className="snap-center rounded-lg border-2 border-blue-400 ring-1 ring-blue-300">
            <Skeleton className="h-10 w-10 rounded" />
          </li>
        </ul>
      </div>

      <Separator />

      {/* Image Gallery Skeleton */}
      <div className="relative">
        <div className="h-[200px] rounded">
          <Skeleton className="h-full w-full rounded" />
        </div>
      </div>

      {/* Image Thumbnails Skeleton */}
      <div className="relative">
        <ul className="hide-scrollbar relative flex h-12 snap-x snap-mandatory items-center justify-center gap-1 overflow-x-auto rounded px-7">
          <li className="snap-center rounded-lg border-2 border-blue-400 ring-1 ring-blue-300">
            <Skeleton className="h-10 w-10 rounded" />
          </li>
        </ul>
      </div>

      <Separator />

      {/* Add Images Button Skeleton */}
      <Skeleton className="h-6 w-32" />
      <Separator />

      {/* Delete Image Button Skeleton */}
      <Skeleton className="h-6 w-28" />
      <Separator />

      {/* Location Button Skeleton */}
      <Skeleton className="h-6 w-40" />
      <Separator />

      {/* Title Input Skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Description Textarea Skeleton */}
      <Skeleton className="h-[100px] w-full rounded-md" />

      {/* Delete Post Button Skeleton */}
      <div className="flex items-center">
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  );
}
