import { Skeleton } from "../../ui/skeleton";

export function PostListsSkeletion() {
  return (
    <div className="space-y-2">
      <Skeleton className="relative max-w-[200px] rounded text-lg before:content-['\00a0']" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="aspect-[4/3] max-w-[300px] flex-grow rounded" />
        <Skeleton className="aspect-[4/3] max-w-[300px] flex-grow rounded" />
      </div>
      <Skeleton className="h-[20px] max-w-[200px] rounded" />
      <Skeleton className="h-[20px] max-w-[250px] rounded" />
      <Skeleton className="h-[20px] max-w-[200px] rounded" />
    </div>
  );
}
