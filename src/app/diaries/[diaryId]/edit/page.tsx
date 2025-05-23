"use client";

import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/_lib/ui/button";
import { Input } from "@/_lib/ui/input";
import { cn } from "@/_lib/utils/cx";
import type { RouterOutputs } from "~/server/trpc";
import { api } from "~/trpc/TrpcProvider";
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

export default function EditDiary() {
  const params = useParams();
  const {
    data: diary,
    isLoading,
    isError,
  } = api.diary.getDiary.useQuery(
    { diaryId: Number(params.diaryId) },
    {
      enabled: !!params.diaryId,
      staleTime: Infinity,
    },
  );
  const router = useRouter();
  const queryUtils = api.useUtils();
  const deleteDiaryMutation = api.diary.deleteDiary.useMutation({
    onSuccess(diaryId) {
      queryUtils.diary.getDiary.setData({ diaryId }, null);
      queryUtils.diary.getDiaries.setData(undefined, (diaries = []) => {
        return diaries.filter((diary) => diary.id !== diaryId);
      });
      router.push(`/diaries`);
    },
  });
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
  const [diaryName, setDiaryName] = useState(diary?.name ?? "");
  const id = useId();
  const router = useRouter();
  const goToDiaries = () => router.push("./entries");
  const queryUtils = api.useUtils();
  const editDiaryMutation = api.diary.editDiary.useMutation({
    async onSuccess() {
      if (diary?.id !== undefined) {
        await queryUtils.diary.getDiary.invalidate({ diaryId: diary.id });
        router.push(`./entries`);
      }
    },
  });
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
