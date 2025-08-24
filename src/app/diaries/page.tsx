"use client";;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/_lib/ui/dialog";
import { Input } from "@/_lib/ui/input";
import { type FormEvent, useState } from "react";
import { useTRPC } from "~/trpc/TrpcProvider";
import Link from "next/link";
import { cn } from "@/_lib/utils/cx";
import { Button } from "@/_lib/ui/button";
import { Skeleton } from "@/_lib/ui/skeleton";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export default function Diaries() {
  return (
    <div className="grid grid-cols-1 gap-5">
      <Header />
      <main className="h-full">
        <ul className="grid h-full grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
          <DiaryList />
        </ul>
      </main>
    </div>
  );
}

function DiaryList() {
  const api = useTRPC();
  const { isLoading, isError, data } = useQuery(api.diary.getDiaries.queryOptions());

  if (isLoading) {
    return Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="aspect-[3/4]" />
    ));
  }

  if (isError) {
    return <p>Something went wrong!</p>;
  }

  const diaries = data ?? [];
  console.log(diaries);
  return diaries.map(({ id, name }) => (
    <li key={id} className="h-full">
      <Link
        href={`${"/diaries"}/${id.toString()}/entries`}
        className={cn(
          "grid aspect-[3/4] w-full place-items-center rounded-md border-2 border-primary p-4",
          isOptimistic(id) && "opacity-70",
        )}
      >
        {name}
      </Link>
    </li>
  ));
}

function Header() {
  const api = useTRPC();
  const [newDiaryName, setNewDiaryName] = useState("");
  const queryClient = useQueryClient();
  const addDiary = useMutation(api.diary.createDiary.mutationOptions({
    async onMutate(newDiary) {
      await queryClient.cancelQueries(api.diary.getDiaries.pathFilter());
      const previousDiaries = queryClient.getQueryData(api.diary.getDiaries.queryKey()) ?? [];
      queryClient.setQueryData(api.diary.getDiaries.queryKey(), (old) => [
        ...(old ?? []),
        newDiary,
      ]);
      return { previousDiaries };
    },
    onError(_err, _newDiary, context) {
      queryClient.setQueryData(api.diary.getDiaries.queryKey(), context?.previousDiaries ?? []);
    },
    onSettled() {
      return queryClient.invalidateQueries(api.diary.getDiaries.pathFilter());
    },
  }));
  const createDiary = (e: FormEvent) => {
    e.preventDefault();
    setNewDiaryName("");
    setIsModalOpen(false);
    addDiary.mutate({ id: crypto.randomUUID(), name: newDiaryName });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <header className="flex items-center justify-between">
      <Dialog open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e)}>
        <DialogTrigger asChild>
          <Button>New Diary</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="grid gap-4">
            <DialogTitle>Create a New Diary</DialogTitle>
            <DialogDescription asChild>
              <form className="grid gap-4" onSubmit={createDiary}>
                <div className="grid gap-2">
                  <label className="flex">Name</label>
                  <Input
                    value={newDiaryName}
                    onChange={(e) => setNewDiaryName(e.target.value)}
                  />
                </div>
                <Button>Create</Button>
              </form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function isOptimistic(id: string | number) {
  return typeof id === "string";
}
