"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { cn } from "~/app/_utils/cx";
import { RouterOutputs } from "~/server/api/trpc";
import { api } from "~/trpc/client";
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
} from "@/components/ui/alert-dialog";

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
            <AlertDialogAction>Continue</AlertDialogAction>
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
  diary: RouterOutputs["diary"]["getDiary"];
  isLoading: boolean;
}) {
  const [diaryName, setDiaryName] = useState(diary?.name ?? "");
  const id = useId();
  const router = useRouter();
  const goToDiaries = () => router.push("./entries");
  const queryUtils = api.useContext();
  const editDiaryMutation = api.diary.editDiary.useMutation({
    async onSuccess() {
      if (diary?.id !== undefined) {
        await queryUtils.diary.getDiary.invalidate({ diaryId: diary.id });
        router.push(`./entries`);
      }
    },
  });
  const editDiary = async (e: FormEvent<HTMLFormElement>) => {
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
