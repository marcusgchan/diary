"use client";

import { useId, useState } from "react";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";

export default function EditDiary() {
  const id = useId();
  const [diaryName, setDiaryName] = useState("");
  return (
    <main>
      <Button className="ml-auto block" variant="destructive">
        Delete Diary
      </Button>
      <form>
        <div>
          <label htmlFor={`${id}-title`}>Diary Name:</label>
          <Input
            id={`${id}-title`}
            type="text"
            value={diaryName}
            onChange={(e) => setDiaryName(e.target.value)}
          />
        </div>
        <div>
          <Button>Back</Button>
          <Button>Edit</Button>
        </div>
      </form>
    </main>
  );
}
