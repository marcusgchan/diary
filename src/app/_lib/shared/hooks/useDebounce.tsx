import { useCallback, useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<TCallback extends (...args: any[]) => any>(
  callback: TCallback,
  config: { waitInMs: number },
): TCallback {
  const timerRef = useRef<NodeJS.Timeout>(null);

  const func = useCallback(
    (...args: unknown[]): void => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      timerRef.current = setTimeout(() => {
        callback(...args);
        timerRef.current = null;
      }, config.waitInMs);
    },
    [callback, config.waitInMs],
  ) as TCallback;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return func;
}
