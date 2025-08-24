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
        if (deletedId) {
          queryClient.setQueryData(
            api.diary.getEntries.queryKey({ diaryId: Number(diaryId) }),
            (entries) => {
              if (entries === undefined) {
                return [];
              }
              return entries.filter((entry) => entry.id !== deletedId);
            },
          );
          router.push(`/diaries/${diaryId}/entries`);
        }
      },
    }),
  );
  const handleDelete = (diaryId: number, entryId: number) =>
    deleteEntryMutation.mutate({
      diaryId: diaryId,
      entryId: entryId,
    });

  if (entries) {
    return (
      <ul className="grid gap-1">
        {entries.map((entry) => {
          return (
            <li key={entry.id}>
              <Link
                className={cn(
                  "hidden justify-between rounded bg-secondary p-1 sm:flex",
                  entryId && Number(entryId) === entry.id && "bg-secondary/60",
                )}
                href={`/diaries/${entry.diaryId}/entries/${entry.id}`}
              >
                {entry.day}
                <DeleteEntryDialog
                  handleDelete={handleDelete}
                  entryId={entry.id}
                  diaryId={diaryId}
                />
              </Link>
              <Link
                className={cn(
                  "flex justify-between rounded bg-secondary p-1 sm:hidden",
                  entryId && Number(entryId) === entry.id && "bg-secondary/15",
                )}
                href={`/diaries/${entry.diaryId}/entries/${entry.id}`}
              >
                {entry.day}
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
