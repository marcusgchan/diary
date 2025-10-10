import { type RefObject, useState } from "react";
import type { PostForm as Post } from "~/server/lib/types";

export function useScrollToImage(containerRef: RefObject<HTMLElement | null>) {
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  function scrollToImage(id: Post["id"], instant = false) {
    const el = document.querySelector(`[data-image-id="${id}"]`);
    if (!el) return;

    if (instant) {
      el.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      });
      return;
    }

    setIsScrollingProgrammatically(true);

    const container = containerRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      setIsScrollingProgrammatically(false);
      container.removeEventListener("scrollend", handleScrollEnd);
    };
    container.addEventListener("scrollend", handleScrollEnd);

    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return { scrollToImage, isScrollingProgrammatically };
}
