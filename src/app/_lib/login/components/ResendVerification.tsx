import { useEffect, useRef, useState } from "react";

type ResendVerificationProps = {
  children: ({
    timer,
    active,
  }: {
    timer: number;
    active: boolean;
    handleClick: (callback?: () => void | Promise<void>) => Promise<void>;
  }) => React.ReactNode;
};
export function ResendVerification(props: ResendVerificationProps) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timerValue, setTimerValue] = useState<number>(60);
  async function handleClick(callback?: () => void | Promise<void>) {
    if (callback) {
      await callback();
    }
    setActive(true);
    timerRef.current = setInterval(() => {
      setTimerValue((prev) => {
        if (prev === 0) {
          setActive(false);
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

  return props.children({ active, timer: timerValue, handleClick });
}
