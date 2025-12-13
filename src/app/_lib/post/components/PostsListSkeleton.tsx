import { Skeleton } from "../../ui/skeleton";
import { cn } from "../../utils/cx";

export function PostListsSkeletion() {
  const skeletonPosts = Array.from({ length: 2 });

  return (
    <div className="h-full space-y-2">
      {/* Mobile: Vertical list layout */}
      <ul className="space-y-2 lg:hidden">
        {skeletonPosts.map((_, i) => (
          <li key={i} className="space-y-2">
            {/* Title skeleton */}
            <Skeleton className="mb-1 h-7 w-3/4 rounded" />
            {/* Image carousel skeleton */}
            <div className="space-y-2">
              <Skeleton className="aspect-square w-full rounded" />
              {/* Thumbnail indicators skeleton */}
              <ul className="flex justify-center gap-1">
                <li>
                  <Skeleton className="aspect-square w-[40px] rounded" />
                </li>
                <li>
                  <Skeleton className="aspect-square w-[40px] rounded" />
                </li>
              </ul>
            </div>
            {/* Description skeleton */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-4/6 rounded" />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: Animated grid layout */}
      <div className="hidden h-full grid-cols-[minmax(0,1fr)_100px_1fr] lg:grid">
        {skeletonPosts.flatMap((_, i) => {
          return [
            <div
              className={cn(
                "[grid-row-end:span_2]",
                i % 2 === 0 && "col-start-1 col-end-2",
                i % 2 === 1 && "col-start-3 col-end-4",
              )}
              style={{ gridRowStart: 1 + i * 2 }}
              key={`post-${i}`}
            >
              {/* Title skeleton */}
              <Skeleton className="mb-2 h-7 w-3/4 rounded" />
              {/* Image carousel skeleton */}
              <div className="space-y-2">
                <Skeleton className="aspect-square w-full rounded" />
                {/* Thumbnail indicators skeleton */}
                <ul className="flex justify-center gap-1">
                  <li>
                    <Skeleton className="aspect-square w-[40px] rounded" />
                  </li>
                  <li>
                    <Skeleton className="aspect-square w-[40px] rounded" />
                  </li>
                </ul>
              </div>
            </div>,
            <div
              key={`description-${i}`}
              className={cn(
                "h-full min-h-0 content-center p-14 [grid-row-end:span_2]",
                i % 2 === 0 && "col-start-3 col-end-4",
                i % 2 === 1 && "col-start-1 col-end-2",
              )}
              style={{ gridRowStart: 1 + i * 2 }}
            >
              {/* Description skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-4/6 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            </div>,
          ];
        })}
      </div>
    </div>
  );
}
