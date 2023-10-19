"use client";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../components/ui/input";
import { FormEvent, useState } from "react";
import { api } from "../trpc/api";
import Link from "next/link";
import { cn } from "../utils/cx";

export default function Diaries() {
  const { data: dairies, isLoading, isError } = api.diary.getDiaries.useQuery();
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      <Header />
      <main className="h-full">
        <ul className="grid h-full grid-cols-4 gap-4">
          {dairies.map(({ id, name }) => (
            <li key={id} className="h-full">
              <Link
                href={`${"/diaries"}/${id.toString()}`}
                className={cn(
                  "grid aspect-[3/4] w-full place-items-center rounded-md border-2 border-primary p-4",
                  isOptimistic(id) && "opacity-70",
                )}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function Header() {
  const [newDiaryName, setNewDiaryName] = useState("");
  const queryUtils = api.useContext();
  const addDiary = api.diary.createDiary.useMutation({
    async onMutate(newDiary) {
      await queryUtils.diary.getDiaries.cancel();
      const previousDiaries = queryUtils.diary.getDiaries.getData() ?? [];
      queryUtils.diary.getDiaries.setData(undefined, (old) => [
        ...(old ?? []),
        newDiary,
      ]);
      return { previousDiaries };
    },
    onError(err, newDiary, context) {
      queryUtils.diary.getDiaries.setData(
        undefined,
        context?.previousDiaries ?? [],
      );
    },
    onSettled() {
      queryUtils.diary.getDiaries.invalidate();
    },
  });
  const createDiary = (e: FormEvent) => {
    e.preventDefault();
    setNewDiaryName("");
    setIsModalOpen(false);
    addDiary.mutate({ id: crypto.randomUUID(), name: newDiaryName });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <header className="flex items-center justify-between">
      <h2>Diaries</h2>
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
