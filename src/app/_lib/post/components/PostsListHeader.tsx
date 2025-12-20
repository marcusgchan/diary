"use client";
import { Image as ImageIcon } from "lucide-react";
import React, { type ReactNode, useCallback } from "react";
import { useDndContext } from "@dnd-kit/core";
import { SortableItem } from "../../shared/SortableItem";
import { cn } from "../../utils/cx";
import type { PostForm, PostFormImage } from "~/server/lib/types";
import { usePostListScrollTracking } from "../contexts/PostListScrollTrackingContext";
import { useImageScrollTracking } from "../contexts/ImageScrollTrackingContext";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import { Badge } from "../../ui/badge";

export function PostsSelectionCarousel() {
  const {
    state: { posts },
  } = usePosts();

  const {
    scrollToImage: scrollToPostImage,
    containerRef: scrollPostContainerRef,
    setImageElementRef,
    getImageElementsMap: getPostImageElementsMap,
  } = usePostListScrollTracking<HTMLUListElement, HTMLLIElement>();
  const { scrollToImage, getImageElementsMap } = useImageScrollTracking<
    HTMLDivElement,
    HTMLLIElement
  >();
  const { editPostAction, postIntersectAction } = usePostActions();
  const { active } = useDndContext();
  const isDragging = active !== null;

  function handleSelectPost(post: PostForm) {
    editPostAction(post);
    const el = getPostImageElementsMap().get(post.id)!;
    scrollToPostImage(el);

    // Scroll to first image when clicking same post after selecting non-first image
    if (post.images.length > 0) {
      const firstImageId = post.images[0]!.id;
      const imageElement = getImageElementsMap().get(firstImageId)!;
      if (imageElement) {
        scrollToImage(imageElement, true);
      }
    }
  }

  const spacers = (
    <>
      <li className="h-10 w-10 shrink-0"></li>
      <li className="h-10 w-10 shrink-0"></li>
      <li className="h-10 w-5 shrink-0"></li>
    </>
  );
  return (
    <ul
      ref={scrollPostContainerRef}
      className={cn(
        "hide-scrollbar flex snap-x snap-mandatory items-center gap-2 overflow-x-auto rounded px-7 py-2",
        isDragging && "snap-none",
      )}
    >
      {spacers}
      {posts.map((post) => {
        return (
          <SortableItem key={post.id} id={post.id}>
            {(props) => {
              return (
                <li
                  {...props.listeners}
                  {...props.attributes}
                  onClick={() => handleSelectPost(post)}
                  style={{
                    ...props.style,
                    opacity: props.isDragging ? 0 : 1,
                  }}
                  ref={(el) => {
                    props.setNodeRef(el);
                    setImageElementRef(post.id)(el);
                  }}
                  className={cn(
                    "snap-center rounded-lg border-2",
                    post.isSelected && "border-blue-400 ring-1 ring-blue-300",
                  )}
                >
                  <PostScrollableContainer<HTMLDivElement>
                    id={post.id}
                    onIntersect={postIntersectAction}
                    threshold={0.6}
                    rootMargin="0px -45% 0px -45%"
                  >
                    {({ ref }) => (
                      <div ref={ref}>
                        {post.images.length > 0 && (
                          <div className="relative h-10 w-10">
                            <Badge className="absolute right-0 top-0 block h-5 min-w-5 -translate-y-1/2 translate-x-1/2 rounded-full p-0 text-center font-mono tabular-nums">
                              {post.images.length}
                            </Badge>
                            <ImageRenderer image={post.images[0]!} />
                          </div>
                        )}
                        {post.images.length === 0 && (
                          <ImageIcon className="h-10 w-10 text-foreground" />
                        )}
                      </div>
                    )}
                  </PostScrollableContainer>
                </li>
              );
            }}
          </SortableItem>
        );
      })}
      {spacers}
    </ul>
  );
}

type ImageProps = {
  image: PostFormImage;
  showErrorText?: boolean;
};

function ImageRenderer({ image, showErrorText = false }: ImageProps) {
  function stripUuid(name: string) {
    let count = 0;
    let i = 0;
    while (count < 5) {
      const ch = name[i];
      if (ch === "-") {
        count++;
      }
      i++;
    }

    return name.substring(i);
  }

  if (image.type === "loaded") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={`/api/image/${image.key}`}
        className="pointer-events-none h-full w-full rounded object-cover"
        alt={image.name}
      />
    );
  }

  if (image.type === "compression_error") {
    return (
      <div className="h-full w-full content-center items-center bg-red-200 p-2 text-center">
        {showErrorText && (
          <p>There was a problem uploading image: {stripUuid(image.name)}</p>
        )}
      </div>
    );
  }

  return <Skeleton className="h-full w-full" />;
}

type ImageContainerProps<U extends Element> = {
  id: string;
  children: ({ ref }: { ref: (node: U | null) => void }) => ReactNode;
  onIntersect: (intersectionId: string) => void;
  threshold?: number;
  rootMargin?: string;
};

function PostScrollableContainer<U extends Element>({
  id,
  children,
  onIntersect,
  threshold = 0,
  rootMargin,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    usePostListScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (_element: Element) => {
        onIntersect(id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically,
    threshold,
    rootMargin,
  });
  return children({ ref });
}
