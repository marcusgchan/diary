"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function Login() {
  const callbackUrl = useSearchParams();
  return (
    <Button
      onClick={() =>
        signIn(undefined, {
          callbackUrl: callbackUrl.get("redirect") ?? "/diaries",
        })
      }
    >
      Sign In
    </Button>
  );
}
