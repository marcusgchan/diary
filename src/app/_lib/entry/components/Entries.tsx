"use client";
import { Trash } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
} from "~/app/_lib/ui/alert-dialog";
import { Skeleton } from "~/app/_lib/ui/skeleton";
import { cn } from "~/app/_lib/utils/cx";
import { useTRPC } from "~/trpc/TrpcProvider";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export function Entries() {
  const api = useTRPC();
  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);
  const router = useRouter();
  const { data: entries, isError } = useQuery(
    api.diary.getEntries.queryOptions(
      { diaryId: Number(diaryId) },
      {
        enabled: !!diaryId,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const queryClient = useQueryClient();
  const deleteEntryMutation = useMutation(
    api.diary.deleteEntry.mutationOptions({
      onSuccess(deletedId) {
        if (!deletedId) {
          return;
        }

        // Update the query cache and get the remaining entries
        const remainingEntries = queryClient.setQueryData(
          api.diary.getEntries.queryKey({ diaryId: Number(diaryId) }),
          (entries) => {
            if (entries === undefined) {
              return [];
            }
            return entries.filter((entry) => entry.id !== deletedId);
          },
        );

        // Redirect to the latest entry after deletion
        const hasRemainingEntries =
          remainingEntries && remainingEntries.length > 0;
        const latestEntry = hasRemainingEntries
          ? remainingEntries[0]
          : undefined;

        if (latestEntry) {
          router.push(`/diaries/${diaryId}/entries/${latestEntry.id}/posts`);
          return;
        }

        // No entries remaining, go to entries list
        router.push(`/diaries/${diaryId}/entries`);
      },
    }),
  );
  const handleDelete = (diaryId: number, entryId: number) =>
    deleteEntryMutation.mutate({
      diaryId: diaryId,
      entryId: entryId,
    });

  if (entries && entries.length === 0) {
    return <p>There are no entries</p>;
  }

  if (entries) {
    return (
      <ul className="grid gap-2">
        {entries.map((entry) => {
          return (
            <li key={entry.id}>
              <Link
                className={cn(
                  "hidden items-center justify-between gap-2 overflow-hidden rounded bg-secondary p-1 sm:flex",
                  entryId && Number(entryId) === entry.id && "bg-secondary/20",
                )}
                href={`/diaries/${entry.diaryId}/entries/${entry.id}`}
              >
                <span className="min-w-0 flex-1 truncate">{entry.day}</span>
                <DeleteEntryDialog
                  handleDelete={handleDelete}
                  entryId={entry.id}
                  diaryId={diaryId}
                />
              </Link>
              <Link
                className={cn(
                  "flex items-center justify-between gap-2 overflow-hidden rounded bg-secondary p-1 sm:hidden",
                  entryId && Number(entryId) === entry.id && "bg-secondary/15",
                )}
                href={`/diaries/${entry.diaryId}/entries/${entry.id}`}
              >
                <span className="min-w-0 flex-1 truncate">{entry.day}</span>
                <DeleteEntryDialog
                  handleDelete={handleDelete}
                  entryId={entry.id}
                  diaryId={diaryId}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }
  if (isError) {
    return <p>Unable to load entries</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i}>
          <Skeleton key={i} className="h-8 w-full" />
        </li>
      ))}
    </ul>
  );
}

function DeleteEntryDialog({
  diaryId,
  entryId,
  handleDelete,
}: {
  diaryId: number;
  entryId: number;
  handleDelete: (diaryId: number, entryId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open}>
      <AlertDialogTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Trash />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              handleDelete(diaryId, entryId);
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
