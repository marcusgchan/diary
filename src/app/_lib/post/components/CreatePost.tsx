"use client";

import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/app/_lib/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_lib/ui/popover";
import { Skeleton } from "@/app/_lib/ui/skeleton";
import { format, isEqual, parseISO, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";

type NextAvailableDayRes = { loading: false; data: string } | { loading: true };

export function CreateEmptyPost() {
  const params = useParams();
  const diaryId = Number(params.diaryId);
  const api = useTRPC();
  const { data: entries, isPending } = useQuery(
    api.diary.getEntries.queryOptions({ diaryId }),
  );

  const nextAvaliableDay: NextAvailableDayRes = React.useMemo(() => {
    if (!entries || isPending) {
      return { loading: true } as const;
    }

    const today = new Date();
    const todayString = today.toLocaleDateString("en-CA");

    const indexOfToday = entries.findIndex(
      (entry) => entry.day === todayString,
    );
    if (indexOfToday === -1) {
      return { loading: false, data: todayString } as const;
    }

    let previousDate = parseISO(todayString);
    for (let i = indexOfToday + 1; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) {
        throw new Error("wat2");
      }

      const currentDate = parseISO(entry.day);
      const prevDayMinusOne = subDays(previousDate, 1);
      // No gap found
      if (isEqual(currentDate, prevDayMinusOne)) {
        previousDate = currentDate;
        continue;
      }

      // Found gap between previousDate and currentDate
      return {
        loading: false,
        data: prevDayMinusOne.toLocaleDateString("en-CA"),
      } as const;
    }

    return {
      loading: false,
      data: subDays(previousDate, 1).toLocaleDateString("en-CA"),
    } as const;
  }, [entries, isPending]);

  const disabledDates = React.useMemo(() => {
    if (entries === undefined) {
      return { loading: true } as const;
    }

    const dates = entries.map((entry) => {
      return entry.day;
    });

    return { loading: false, data: dates } as const;
  }, [entries]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 rounded-full bg-foreground p-3"
          type="button"
        >
          <Plus className="text-background" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form className="flex flex-col gap-2">
          <DialogHeader>
            <DialogTitle>Add Post</DialogTitle>
            <DialogDescription>Choose a date</DialogDescription>
          </DialogHeader>
          {nextAvaliableDay.loading || disabledDates.loading ? (
            <CalendarButtonSkeleton />
          ) : (
            <Calendar28
              disabledDates={disabledDates.data}
              defaultDate={nextAvaliableDay.data}
            />
          )}
          <div className="mt-2 flex justify-center gap-2 sm:flex sm:gap-2">
            <Button type="button">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Calendar28({
  defaultDate,
  disabledDates,
}: {
  disabledDates: string[];
  defaultDate: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    parseISO(defaultDate),
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);

  return (
    <div className="flex flex-col gap-3">
      <Popover modal={true} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-picker"
            variant="outline"
            className="w-full justify-center text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="sr-only">Select date</span>
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            disabled={(day) =>
              disabledDates.includes(day.toLocaleDateString("en-CA"))
            }
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CalendarButtonSkeleton() {
  return <Skeleton className="h-9 w-full rounded-md border border-input" />;
}
