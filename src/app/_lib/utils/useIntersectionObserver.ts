import { useState, useEffect, useCallback } from "react";

export type IntersectionObserverReturn<T extends Element> = {
  ref: (node: T | null) => void;
};

export type IntersectionObserverResult<T extends Element> = {
  onIntersect: (element: Element) => void;
  rootElement: T | null;
  disabled?: boolean;
  threshold?: number;
  rootMargin?: string;
};

export function useIntersectionObserver<T extends Element, U extends Element>({
  onIntersect,
  disabled,
  rootElement,
  threshold = 0,
  rootMargin,
}: IntersectionObserverResult<T>): IntersectionObserverReturn<U> {
  const [element, setElement] = useState<U | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (element === null) return;
    if (rootElement === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio (most centered)
        const centerEntry = entries.reduce(
          (max, entry) =>
            entry.intersectionRatio >= threshold &&
            entry.intersectionRatio > (max?.intersectionRatio ?? 0)
              ? entry
              : max,
          null as IntersectionObserverEntry | null,
        );
        if (centerEntry) {
          const element = centerEntry.target;
          if (element) {
            onIntersect(element);
          }
        }
      },
      {
        root: rootElement,
        threshold: threshold,
        rootMargin: rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onIntersect, disabled, rootElement, element, threshold, rootMargin]);

  const setRef = useCallback((node: U | null) => {
    setElement(node);
  }, []);

  return { ref: setRef };
}
