"use client";
import { Image as ImageIcon } from "lucide-react";
import React, { type ReactNode, useCallback } from "react";
import { useDndContext } from "@dnd-kit/core";
import { SortableItem } from "../../shared/SortableItem";
import { cn } from "../../utils/cx";
import type { PostFormImage } from "~/server/lib/types";
import { usePostListScrollTracking } from "../contexts/PostListScrollTrackingContext";
import { useImageScrollTracking } from "../contexts/ImageScrollTrackingContext";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import { Badge } from "../../ui/badge";

export function PostsListHeader() {
  const {
    dispatch,
    state: { posts },
  } = usePosts();

  const {
    scrollToImage: scrollToPostImage,
    containerRef: scrollPostContainerRef,
    getImageElementsMap: getPostImageElementsMap,
  } = usePostListScrollTracking<HTMLUListElement, HTMLLIElement>();
  const { scrollToImage, getImageElementsMap } = useImageScrollTracking<
    HTMLDivElement,
    HTMLLIElement
  >();
  const onPostImageIntersect = useCallback(
    (_element: Element, intersectId: string) => {
      dispatch({ type: "START_EDITING", payload: intersectId });
    },
    [dispatch],
  );
  const { handleEditPost: onEditPost } = usePostActions();
  const { active } = useDndContext();
  const isDragging = active !== null;

  const spacers = (
    <>
      <li className="h-10 w-10 shrink-0 bg-green-200"></li>
      <li className="h-10 w-10 shrink-0 bg-green-200"></li>
      <li className="h-10 w-5 shrink-0 bg-green-200"></li>
    </>
  );
  return (
    <ul
      ref={scrollPostContainerRef}
      className={cn(
        "flex snap-x snap-mandatory gap-2 overflow-x-auto rounded bg-gray-300 px-7 py-3",
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
                  onClick={() => {
                    onEditPost(
                      post,
                      scrollToPostImage,
                      getPostImageElementsMap().get(post.id)!,
                    );
                    // Scroll to first image when post is selected
                    if (post.images.length > 0) {
                      const firstImageId = post.images[0]!.id;
                      const imageElement =
                        getImageElementsMap().get(firstImageId);
                      if (imageElement) {
                        scrollToImage(imageElement, true);
                      }
                    }
                  }}
                  style={{
                    ...props.style,
                    opacity: props.isDragging ? 0 : 1,
                  }}
                  ref={(el) => {
                    props.setNodeRef(el);
                    const map = getPostImageElementsMap();
                    if (el) {
                      map.set(post.id, el);
                    } else {
                      map.delete(post.id);
                    }
                  }}
                  className={cn(
                    "snap-center rounded-lg border-2",
                    post.isSelected && "border-blue-400 ring-1 ring-blue-300",
                  )}
                >
                  <PostScrollableContainer<HTMLDivElement>
                    id={post.id}
                    onIntersect={onPostImageIntersect}
                    rootMargin="0px -40% 0px -40%"
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
        className="pointer-events-none h-full w-full object-cover"
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
  onIntersect: (element: Element, intersectionId: string) => void;
  rootMargin?: string;
};

function PostScrollableContainer<U extends Element>({
  id,
  children,
  onIntersect,
  rootMargin,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    usePostListScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (element: Element) => {
        onIntersect(element, id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically,
    threshold: 0.5,
    rootMargin,
  });
  return children({ ref });
}
