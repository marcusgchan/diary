"use client";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";

export function EditPostsLoading() {
  return (
    <div className="flex gap-4">
      {/* Selected Post View Skeleton */}
      <div className="flex w-80 flex-col gap-2 rounded-xl border bg-card p-6 text-card-foreground">
        {/* Image Gallery Skeleton */}
        <div className="relative">
          <div className="hide-scrollbar h-[200px] snap-x snap-mandatory overflow-x-auto scroll-smooth rounded">
            <div className="flex h-full">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* Image Thumbnails Skeleton */}
        <ul className="flex h-12 items-center justify-center gap-1">
          <Skeleton className="aspect-square h-10 w-10 rounded" />
          <Skeleton className="aspect-square h-10 w-10 rounded" />
          <Skeleton className="aspect-square h-10 w-10 rounded" />
        </ul>

        {/* Add Images Button Skeleton */}
        <Skeleton className="h-6 w-32" />
        <Separator />

        {/* Delete Image Button Skeleton */}
        <Skeleton className="h-6 w-24" />
        <Separator />

        {/* Location Button Skeleton */}
        <Skeleton className="h-6 w-20" />
        <Separator />

        {/* Title Input Skeleton */}
        <Skeleton className="h-10 w-full" />

        {/* Description Textarea Skeleton */}
        <Skeleton className="h-[100px] w-full" />

        {/* Delete Post Button Skeleton */}
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded" />
        </div>
      </div>

      {/* Posts Aside Skeleton */}
      <div className="flex flex-col items-center gap-2">
        {/* New Post Button Skeleton */}
        <Skeleton className="h-10 w-10 rounded" />

        {/* Posts List Skeleton */}
        <ul className="grid grow-0 gap-2">
          <li className="rounded border-2 p-2">
            <ul className="flex flex-col gap-2">
              <li className="aspect-square min-h-0 w-12 flex-shrink-0 flex-grow-0 rounded border-2">
                <Skeleton className="h-full w-full" />
              </li>
              <li className="aspect-square min-h-0 w-12 flex-shrink-0 flex-grow-0 rounded border-2">
                <Skeleton className="h-full w-full" />
              </li>
            </ul>
          </li>
          <li className="rounded border-2 p-2">
            <ul className="flex flex-col gap-2">
              <li className="aspect-square min-h-0 w-12 flex-shrink-0 flex-grow-0 rounded border-2">
                <Skeleton className="h-full w-full" />
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
