"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/app/_components/ui/button";
import { Calendar } from "~/app/_components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/app/_components/ui/popover";
import { useToast } from "~/app/_components/ui/use-toast";
import { cn } from "~/app/_utils/cx";
import { api } from "~/trpc/TrpcProvider";

export function DatePicker({ day }: { day: string }) {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const [date, setDate] = useState(parseISO(day));
  const { toast } = useToast();
  const queryUtils = api.useUtils();
  const updateEntryDateMutation = api.diary.updateEntryDate.useMutation({
    async onSuccess(data) {
      await queryUtils.diary.getEntry.invalidate({
        entryId: Number(entryId),
        diaryId: Number(diaryId),
      });
      await queryUtils.diary.getEntries.invalidate({
        diaryId: Number(diaryId),
      });
      setDate(new Date(parseISO(data.day)));
    },
    onError(e) {
      toast({ variant: "destructive", title: e.message });
    },
  });
  function handleChangeDate(date: Date | undefined) {
    const updatedDate = date ?? parseISO(day);
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
          disabled={updateEntryDateMutation.isLoading}
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
