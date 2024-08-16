"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { api } from "~/trpc/client";
import Link from "next/link";
import { cn } from "@/app/_utils/cx";
import { Button } from "@/components/ui/button";
import FetchResolver from "../_components/FetchResolver";
import { Skeleton } from "../_components/ui/skeleton";

export default function Diaries() {
  const diariesQueryState = api.diary.getDiaries.useQuery();
  return (
    <div className="grid grid-cols-1 gap-5">
      <Header />
      <main className="h-full">
        <ul className="grid h-full grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
          <FetchResolver
            {...diariesQueryState}
            loadingComponent={Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          >
            {(diaries) =>
              diaries.map(({ id, name }) => (
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
              ))
            }
          </FetchResolver>
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
