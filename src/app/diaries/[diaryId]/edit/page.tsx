"use client";

import { useParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { cn } from "~/app/_utils/cx";
import { RouterOutputs } from "~/server/api/trpc";
import { api } from "~/trpc/client";

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
    },
  );

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <main className="grid gap-2">
      <Button className="ml-auto block" variant="destructive" type="button">
        Delete Diary
      </Button>
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
  useEffect(() => {
    setDiaryName(diary?.name ?? "");
  }, [diary]);
  return (
    <form className="grid gap-4">
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
        <Button variant="secondary">Back</Button>
        <Button type="button">Edit</Button>
      </div>
    </form>
  );
}
