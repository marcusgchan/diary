"use client";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/app/_lib/ui/button";
import { Calendar } from "~/app/_lib/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/app/_lib/ui/popover";
import { useToast } from "~/app/_lib/ui/use-toast";
import { cn } from "@/_lib/utils/cx";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export function DatePicker() {
  const api = useTRPC();
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = Number(params.entryId);
  const { data } = useQuery(api.diary.getEntryDay.queryOptions({ entryId }));
  const [date, setDate] = useState(data ? parseISO(data) : undefined);
  useEffect(() => {
    if (data) {
      setDate(parseISO(data));
    }
  }, [data]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateEntryDateMutation = useMutation(
    api.diary.updateEntryDate.mutationOptions({
      async onSuccess(data) {
        await queryClient.invalidateQueries(
          api.diary.getEntry.queryFilter({
            entryId: Number(entryId),
            diaryId: Number(diaryId),
          }),
        );
        await queryClient.invalidateQueries(
          api.diary.getEntries.queryFilter({
            diaryId: Number(diaryId),
          }),
        );
        setDate(new Date(parseISO(data.day)));
      },
      onError(e) {
        toast({ variant: "destructive", title: e.message });
      },
    }),
  );
  function handleChangeDate(date: Date | undefined) {
    setIsOpen(false);
    if (!date) {
      return;
    }
    const updatedDate = date;
    updateEntryDateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      day: updatedDate.toLocaleDateString("en-CA"),
    });
  }
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={updateEntryDateMutation.isPending}
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
