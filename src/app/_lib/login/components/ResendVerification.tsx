"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cx";

type ResendVerificationProps = {
  children: React.ReactNode;
};
export function ResendVerification(props: ResendVerificationProps) {
  const [disabled, setDisabled] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timerValue, setTimerValue] = useState<number>(60);
  function handleClick() {
    setDisabled(true);
    timerRef.current = setInterval(() => {
      setTimerValue((prev) => {
        if (prev === 0) {
          setDisabled(false);
          clearTimeout(timerRef.current!);
          return 60;
        }

        return prev - 1;
      });
    }, 1000);
  }
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <span className="inline-flex gap-1">
      <button
        onClick={handleClick}
        disabled={disabled}
        type="button"
        className={cn("underline", disabled && "cursor-not-allowed")}
      >
        {props.children}
      </button>
      {disabled && timerValue}
    </span>
  );
}
