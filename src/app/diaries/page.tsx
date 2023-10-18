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

export default function Diaries() {
  const [newDiaryName, setNewDiaryName] = useState("");
  const queryUtils = api.useContext();
  const addDiary = api.diary.createDiary.useMutation({
    async onMutate(newDiary) {
      await queryUtils.diary.getDiaries.cancel();
      const previousDiaries = queryUtils.diary.getDiaries.getData();
      queryUtils.diary.getDiaries.setData(undefined, (old) => [
        ...(old ?? []),
        newDiary,
      ]);
    },
    onSuccess() {},
  });
  const createDiary = (e: FormEvent) => {
    e.preventDefault();
    setNewDiaryName("");
    setIsModalOpen(false);
    addDiary.mutate({ id: crypto.randomUUID(), name: newDiaryName });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: dairies, isLoading, isError } = api.diary.getDiaries.useQuery();
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error</div>;
  }
  return (
    <section className="grid grid-cols-1">
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
      <main className="h-full">
        <ul className="grid h-full grid-cols-4 gap-4">
          {dairies.map(({ id, name }) => (
            <li key={id} className="h-full">
              <Link
                href={`${"/dashboard"}${id.toString()}`}
                className="inline-block w-full rounded-md border-2 border-primary p-4"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </section>
  );
}
