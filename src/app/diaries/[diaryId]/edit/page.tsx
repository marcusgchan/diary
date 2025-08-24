"use client";;
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/_lib/ui/button";
import { Input } from "@/_lib/ui/input";
import { cn } from "@/_lib/utils/cx";
import type { RouterOutputs } from "~/server/trpc";
import { useTRPC } from "~/trpc/TrpcProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/_lib/ui/alert-dialog";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export default function EditDiary() {
  const api = useTRPC();
  const params = useParams();
  const {
    data: diary,
    isLoading,
    isError,
  } = useQuery(api.diary.getDiary.queryOptions(
    { diaryId: Number(params.diaryId) },
    {
      enabled: !!params.diaryId,
      staleTime: Infinity,
    },
  ));
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteDiaryMutation = useMutation(api.diary.deleteDiary.mutationOptions({
    onSuccess(diaryId) {
      queryClient.setQueryData(api.diary.getDiary.queryKey({ diaryId }), null);
      queryClient.setQueryData(api.diary.getDiaries.queryKey(), (diaries = []) => {
        return diaries.filter((diary) => diary.id !== diaryId);
      });
      router.push(`/diaries`);
    },
  }));
  const deleteDiary = () => {
    if (diary?.id !== undefined) {
      deleteDiaryMutation.mutate({ diaryId: diary.id });
    }
  };

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <main className="grid gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="ml-auto block" variant="destructive" type="button">
            Delete Diary
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              diary and remove your entries from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDiary}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Form diary={diary} isLoading={isLoading} />
    </main>
  );
}

function Form({
  diary,
  isLoading,
}: {
  diary: RouterOutputs["diary"]["getDiary"] | undefined;
  isLoading: boolean;
}) {
  const api = useTRPC();
  const [diaryName, setDiaryName] = useState(diary?.name ?? "");
  const id = useId();
  const router = useRouter();
  const goToDiaries = () => router.push("./entries");
  const queryClient = useQueryClient();
  const editDiaryMutation = useMutation(api.diary.editDiary.mutationOptions({
    async onSuccess() {
      if (diary?.id !== undefined) {
        await queryClient.invalidateQueries(api.diary.getDiary.queryFilter({ diaryId: diary.id }));
        router.push(`./entries`);
      }
    },
  }));
  const editDiary = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (diary?.id && diary.id !== undefined) {
      editDiaryMutation.mutate({
        diaryId: diary.id,
        name: diaryName,
      });
    }
  };
  useEffect(() => {
    setDiaryName(diary?.name ?? "");
  }, [diary]);
  return (
    <form className="grid gap-4" onSubmit={editDiary}>
      <div className="grid justify-start gap-2">
        <label htmlFor={`${id}-title`}>Diary Name:</label>
        <Input
          id={`${id}-title`}
          className={cn(isLoading && "animate-pulse")}
          type="text"
          value={diaryName}
          disabled={isLoading}
          onChange={(e) => setDiaryName(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" onClick={goToDiaries}>
          Back
        </Button>
        <Button>Edit</Button>
      </div>
    </form>
  );
}
