import { useRef, useCallback } from "react";

export function useImageElementsMap<TElement extends HTMLElement>(): {
  getImageElementsMap: () => Map<string, TElement>;
  setImageElementRef: (id: string) => (node: TElement | null) => void;
} {
  const imageElementsRef = useRef<Map<string, TElement>>(null);

  const getImageElementsMap = useCallback(() => {
    if (imageElementsRef.current === null) {
      imageElementsRef.current = new Map<string, TElement>();
      return imageElementsRef.current;
    }
    return imageElementsRef.current;
  }, []);

  const setImageElementRef = useCallback(
    (id: string) => (node: TElement | null) => {
      const map = getImageElementsMap();
      if (node) {
        map.set(id, node);
      } else {
        map.delete(id);
      }
    },
    [getImageElementsMap],
  );

  return {
    getImageElementsMap,
    setImageElementRef,
  };
}
