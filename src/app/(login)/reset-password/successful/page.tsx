import { CircleCheck } from "lucide-react";

export default function Page() {
  return (
    <div>
      <h1 className="flex items-center justify-center gap-2 text-center text-2xl">
        <CircleCheck />
        Success
      </h1>
      <p>You have successfully reset your password. You can close this tab.</p>
    </div>
  );
}
