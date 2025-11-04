import { Skeleton } from "../../ui/skeleton";

export function PostListsSkeletion() {
  return (
    <div className="h-full w-full">
      <ul className="w-full space-y-2">
        <li className="w-full max-w-sm space-y-2">
          <Skeleton className="relative w-full rounded text-lg before:content-['\00a0']" />
          <div className="flex aspect-square w-full">
            <Skeleton className="aspect-square w-full rounded" />
          </div>
          <ul className="flex justify-center gap-1">
            <li>
              <Skeleton className="aspect-square w-[40px] rounded" />
            </li>
            <li>
              <Skeleton className="aspect-square w-[40px] rounded" />
            </li>
          </ul>
          <Skeleton className="h-[20px] w-full max-w-[200px] rounded" />
          <Skeleton className="h-[20px] w-full max-w-[250px] rounded" />
          <Skeleton className="h-[20px] w-full max-w-[200px] rounded" />
        </li>
      </ul>
    </div>
  );
}
