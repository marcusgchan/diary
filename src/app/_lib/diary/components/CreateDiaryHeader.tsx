"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Input } from "../../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

export function CreateDiaryHeader() {
  const api = useTRPC();
  const [newDiaryName, setNewDiaryName] = useState("");
  const queryClient = useQueryClient();
  const addDiary = useMutation(
    api.diary.createDiary.mutationOptions({
      async onMutate(newDiary) {
        await queryClient.cancelQueries(api.diary.getDiaries.pathFilter());
        const previousDiaries =
          queryClient.getQueryData(api.diary.getDiaries.queryKey()) ?? [];
        queryClient.setQueryData(api.diary.getDiaries.queryKey(), (old) => [
          ...(old ?? []),
          newDiary,
        ]);
        return { previousDiaries };
      },
      onError(_err, _newDiary, context) {
        queryClient.setQueryData(
          api.diary.getDiaries.queryKey(),
          context?.previousDiaries ?? [],
        );
      },
      onSettled() {
        return queryClient.invalidateQueries(api.diary.getDiaries.pathFilter());
      },
    }),
  );
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
