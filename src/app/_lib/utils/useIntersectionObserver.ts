import { type RefObject, useRef, useEffect } from "react";

export type IntersectionObserverReturn<T extends Element> = {
  ref: RefObject<T | null>;
};

export function useIntersectionObserver<T extends Element, U extends Element>(
  onIntersect: (element: Element) => void,
  disabled: boolean,
  rootRef?: RefObject<U | null>,
): IntersectionObserverReturn<T> {
  const ref = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver>(null);

  useEffect(() => {
    if (disabled) return;
    if (ref.current === null) {
      throw new Error("ref not set");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const centerEntry = entries.find(
          (entry) => entry.intersectionRatio > 0.8,
        );

        if (centerEntry) {
          const element = centerEntry.target;
          if (element) {
            onIntersect(element);
          }
        }
      },
      {
        root: rootRef?.current,
        threshold: 0.8,
      },
    );

    observerRef.current = observer;
    observerRef.current.observe(ref.current);

    return () => observerRef.current!.disconnect();
  }, [ref, onIntersect, disabled, rootRef]);

  return { ref: ref };
}
