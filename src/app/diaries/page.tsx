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

export default function Diaries() {
  const [newDiaryName, setNewDiaryName] = useState("");
  const createDiary = (e: FormEvent) => {
    e.preventDefault();
    setNewDiaryName("");
  };
  return (
    <section className="grid grid-cols-1">
      <header className="flex items-center justify-between">
        <h2>Diaries</h2>
        <Dialog>
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
      <main className="grid flex-1 grid-cols-4 gap-4"></main>
    </section>
  );
}
