import { type RefObject, useRef, useEffect } from "react";

export type IntersectionObserverReturn<T extends Element> = {
  ref: RefObject<T | null>;
};

export type IntersectionObserverResult<T extends Element> = {
  onIntersect: (element: Element, intersectId: string) => void;
  rootElement: T;
  intersectId: string;
  disabled?: boolean;
};

export function useIntersectionObserver<T extends Element, U extends Element>({
  onIntersect,
  intersectId,
  disabled,
  rootElement,
}: IntersectionObserverResult<T>): IntersectionObserverReturn<U> {
  const ref = useRef<U>(null);

  useEffect(() => {
    if (disabled) return;
    const element = ref.current;
    if (element === null) {
      throw new Error("Missing element ref. Did you forget to set the ref?");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const centerEntry = entries.find(
          (entry) => entry.intersectionRatio > 0.8,
        );
        if (centerEntry) {
          const element = centerEntry.target;
          if (element) {
            onIntersect(element, intersectId);
          }
        }
      },
      {
        root: rootElement,
        threshold: 0.8,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onIntersect, disabled, rootElement, intersectId]);

  return { ref: ref };
}
