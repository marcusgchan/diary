import { CircleCheck } from "lucide-react";

export default function Verified() {
  return (
    <div>
      <h1 className="flex items-center justify-center gap-2 text-center text-2xl">
        <CircleCheck />
        Success
      </h1>
      <p>
        You have successfully accepted there verification link. You can close
        this tab.
      </p>
    </div>
  );
}
