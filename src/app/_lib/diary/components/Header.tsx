"use client";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

export function Header() {
  const api = useTRPC();
  const params = useParams();
  const diaryId = params.diaryId as string;
  const entryId = Number(params.entryId ?? -1);
  const queryClient = useQueryClient();
  const router = useRouter();
  const goToEditDiary = () => router.push(`/diaries/${diaryId}/edit`);
  const goToEditPosts = () =>
    router.push(`/diaries/${diaryId}/entries/${entryId}/posts/edit`);
  const { data: diary } = useQuery(
    api.diary.getDiary.queryOptions(
      {
        diaryId: Number(params.diaryId),
      },
      { enabled: !!params.diaryId, refetchOnWindowFocus: false },
    ),
  );

  const { data: posts } = useQuery(
    api.diary.getPosts.queryOptions({ entryId }),
  );
  const addEntryMutation = useMutation(
    api.diary.createEntry.mutationOptions({
      async onSuccess(data) {
        router.push(`/diaries/${diaryId}/entries/${data.id}`);
        await queryClient.invalidateQueries(
          api.diary.getEntries.queryFilter({
            diaryId: Number(params.diaryId),
          }),
        );
      },
    }),
  );
  const addEntry = () => {
    addEntryMutation.mutate({
      day: new Date().toLocaleDateString("en-CA"),
      diaryId: Number(params.diaryId),
    });
  };
  return (
    <header className="flex justify-between gap-2">
      <h2 className="text-xl">{diary?.name ?? ""}</h2>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger>
            <EllipsisVertical />
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2">
            <ul>
              <li>
                <button
                  className="block w-full rounded px-2 py-2 text-left hover:bg-accent"
                  type="button"
                  onClick={goToEditDiary}
                >
                  Edit Diary
                </button>
              </li>
              <li>
                <button
                  className="block w-full rounded px-2 py-2 text-left hover:bg-accent disabled:opacity-50"
                  type="button"
                  onClick={goToEditPosts}
                  disabled={!posts || posts.length === 0}
                >
                  Edit Posts
                </button>
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
