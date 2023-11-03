"use client";

import { useId, useState } from "react";
import { Button } from "~/app/_components/ui/button";

export default function EditDiary() {
  const id = useId();
  const [diaryName, setDiaryName] = useState("");
  return (
    <main>
      <Button>DeleteDiary</Button>
      <form>
        <div>
          <label htmlFor={`${id}-title`}>Diary Name:</label>
          <input
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
