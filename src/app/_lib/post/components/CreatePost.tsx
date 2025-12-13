"use client";

import { Plus } from "lucide-react";
import { Button } from "../../ui/button";
import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/app/_lib/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_lib/ui/popover";
import { Skeleton } from "@/app/_lib/ui/skeleton";
import { format, isEqual, parseISO, subDays } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams, useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";

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

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const trpc = useTRPC();
  const createEntryMutation = useMutation(
    trpc.diary.createEntry.mutationOptions({
      async onSuccess(data) {
        setIsOpen(false);
        setSelectedDate(null);
        await queryClient.invalidateQueries(
          trpc.diary.getEntries.queryFilter({ diaryId }),
        );
        router.push(`/diaries/${diaryId}/entries/${data.id}/posts/edit`);
      },
    }),
  );

  function handleCreateEntry() {
    if (!selectedDate) {
      return;
    }
    createEntryMutation.mutate({ day: selectedDate, diaryId });
  }

  const onDateChange = React.useCallback(
    (date: string) => setSelectedDate(date),
    [],
  );

  return (
    <>
      {/* z index has to be greater than 2 to prevent btn being behind scrollbar on safari*/}
      <button
        className="fixed bottom-6 right-6 z-10 rounded-full bg-foreground p-3"
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Create new entry"
        {...(isOpen && { inert: true })}
      >
        <Plus className="text-background" />
      </button>
      <AlertDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedDate(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <form className="flex flex-col gap-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Create Entry</AlertDialogTitle>
              <AlertDialogDescription>Choose a date</AlertDialogDescription>
            </AlertDialogHeader>
            {nextAvaliableDay.loading || disabledDates.loading ? (
              <CalendarButtonSkeleton />
            ) : (
              <Calendar28
                disabledDates={disabledDates.data}
                defaultDate={nextAvaliableDay.data}
                onDateChange={onDateChange}
              />
            )}
            <div className="mt-2 flex justify-center gap-2 sm:flex sm:gap-2">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                variant="destructive"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleCreateEntry}
                disabled={createEntryMutation.isPending || !selectedDate}
              >
                Create
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Calendar28({
  defaultDate,
  disabledDates,
  onDateChange,
}: {
  disabledDates: string[];
  defaultDate: string;
  onDateChange: (date: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    parseISO(defaultDate),
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);

  // Initialize selected date when defaultDate changes
  React.useEffect(() => {
    const parsedDate = parseISO(defaultDate);
    setDate(parsedDate);
    setMonth(parsedDate);
    onDateChange(defaultDate);
  }, [defaultDate, onDateChange]);

  const isDisabled = React.useCallback(
    (day: Date) => {
      return disabledDates.includes(day.toLocaleDateString("en-CA"));
    },
    [disabledDates],
  );

  return (
    <div className="flex flex-col gap-3">
      <Popover modal={true} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild inert={open}>
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
            disabled={isDisabled}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              setDate(date);
              if (date) {
                onDateChange(date.toLocaleDateString("en-CA"));
              }
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
