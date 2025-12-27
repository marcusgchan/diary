import { useState, useCallback } from "react";

export function useScrollToImage<T extends HTMLElement>(): {
  scrollToImage: (element: Element, instant?: boolean) => void;
  isScrollingProgrammatically: boolean;
  containerRef: (node: T | null) => void;
  containerElement: T | null;
} {
  const [containerElement, setContainerElement] = useState<T | null>(null);
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  const scrollToImage = useCallback(
    (element: Element, instant = false): void => {
      if (instant) {
        element.scrollIntoView({
          behavior: "instant",
          block: "nearest",
          inline: "center",
        });
        return;
      }

      setIsScrollingProgrammatically(true);

      if (!containerElement) return;

      const handleScrollEnd = () => {
        setIsScrollingProgrammatically(false);
        containerElement.removeEventListener("scrollend", handleScrollEnd);
      };
      containerElement.addEventListener("scrollend", handleScrollEnd);

      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    },
    [containerElement],
  );

  const setContainerRef = useCallback((node: T | null) => {
    setContainerElement(node);
  }, []);

  return {
    scrollToImage,
    isScrollingProgrammatically,
    containerRef: setContainerRef,
    containerElement,
  };
}
