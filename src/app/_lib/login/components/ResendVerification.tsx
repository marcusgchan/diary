import { useEffect, useRef, useState } from "react";
import { authClient } from "../../utils/auth-client";

type ResendVerificationProps = {
  children: ({
    timer,
    active,
  }: {
    timer: number;
    active: boolean;
    handleClick: (email: string) => Promise<void>;
  }) => React.ReactNode;
};
export function ResendVerification(props: ResendVerificationProps) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timerValue, setTimerValue] = useState<number>(60);
  async function handleClick(email: string) {
    await authClient.sendVerificationEmail({ email });
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
