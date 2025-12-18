import { useRef } from "react";
import { useScrollToImage } from "./useScrollToImage";

export function useImageScrollTracking<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
>() {
  const scrollToImageResult = useScrollToImage<TContainer>();
  const imageElementsRef = useRef<Map<string, TElement>>(null);

  function getImageElementsMap() {
    if (imageElementsRef.current === null) {
      imageElementsRef.current = new Map<string, TElement>();
      return imageElementsRef.current;
    }
    return imageElementsRef.current;
  }

  return {
    ...scrollToImageResult,
    getImageElementsMap,
  };
}
