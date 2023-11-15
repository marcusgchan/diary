"use client";

import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { api } from "~/trpc/client";
import { Editor } from "./Editor";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "~/app/_components/ui/button";
import { cn } from "~/app/_utils/cx";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Entry() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entryQuery = api.diary.getEntry.useQuery({
    entryId: Number(entryId),
    diaryId: Number(diaryId),
  });
  return (
    <FetchResolver
      {...entryQuery}
      loadingComponent={
        <main className="flex h-full flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-full w-full" />
        </main>
      }
    >
      {(data) => {
        return !data ? (
          <main>Doesn&#39;t exist</main>
        ) : (
          <main className="flex h-full flex-col gap-2">
            <h3 className="text-2xl">
              {data.title ?? (
                <span className="text-gray-400">Enter Title...</span>
              )}
            </h3>
            <DatePicker day={data.day} />
            <Editor initialEditorState={data.editorState} />
          </main>
        );
      }}
    </FetchResolver>
  );
}

function DatePicker({ day }: { day: string }) {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const [date, setDate] = useState<Date>(new Date(day.replaceAll("-", ",")));
  const queryUtils = api.useContext();
  const updateEntryDateMutation = api.diary.updateEntryDate.useMutation({
    async onSuccess() {
      await queryUtils.diary.getEntry.invalidate({
        entryId: Number(entryId),
        diaryId: Number(diaryId),
      });
      await queryUtils.diary.getEntries.invalidate({
        diaryId: Number(diaryId),
      });
    },
  });
  function handleChangeDate(date: Date | undefined) {
    const updatedDate = date ?? new Date(day.replaceAll("-", ","));
    setDate(updatedDate);
    updateEntryDateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      day: updatedDate.toLocaleDateString("en-CA"),
    });
    setIsOpen(false);
  }
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleChangeDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
