"use client";

import { useEffect } from "react";
import { cn } from "@/app/_lib/utils/cx";

interface ScrollHintProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

export function ScrollHint({ message, visible, onDismiss }: ScrollHintProps) {
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 3000); // Auto-dismiss after 3 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
        "duration-200 animate-in fade-in",
      )}
    >
      <div
        className={cn(
          "rounded-lg bg-black/75 px-4 py-2 text-sm font-medium text-white",
          "shadow-lg backdrop-blur-sm",
          "duration-200 animate-in slide-in-from-bottom-2",
        )}
      >
        {message}
      </div>
    </div>
  );
}
