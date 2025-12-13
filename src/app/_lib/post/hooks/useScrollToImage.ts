import { type RefObject, useRef, useState } from "react";

export function useScrollToImage<T extends HTMLElement>(
  containerRef?: RefObject<T | null>,
): {
  scrollToImage: (element: Element, instant?: boolean) => void;
  isScrollingProgrammatically: boolean;
  containerRef: RefObject<T | null>;
} {
  const internalContainerRef = useRef<T>(null);
  const containerRefToUse: RefObject<T | null> =
    containerRef ?? internalContainerRef;
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  function scrollToImage(element: Element, instant = false): void {
    if (instant) {
      element.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      });
      return;
    }

    setIsScrollingProgrammatically(true);

    const container = containerRefToUse.current;
    if (!container) return;

    const handleScrollEnd = () => {
      setIsScrollingProgrammatically(false);
      container.removeEventListener("scrollend", handleScrollEnd);
    };
    container.addEventListener("scrollend", handleScrollEnd);

    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return {
    scrollToImage,
    isScrollingProgrammatically,
    containerRef: containerRefToUse,
  };
}
