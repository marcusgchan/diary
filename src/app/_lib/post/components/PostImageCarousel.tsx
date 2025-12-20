"use client";
import { ImagePlus } from "lucide-react";
import React, {
  type ChangeEvent,
  type RefObject,
  useRef,
  useCallback,
} from "react";
import { Input } from "../../ui/input";
import {
  ImageUpload,
  Dropzone,
  DropzoneContent,
} from "@/_lib/shared/components/ImageUpload";
import { useImageScrollTracking } from "../contexts/ImageScrollTrackingContext";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import type { PostFormImage } from "~/server/lib/types";

export function PostImageCarousel() {
  const { state, dispatch } = usePosts();
  const { filesChangeAction } = usePostActions();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedPostForm = state.posts.find((post) => post.isSelected)!;
  const images = selectedPostForm.images;

  const { containerRef: scrollContainerRef, setImageElementRef } =
    useImageScrollTracking<HTMLDivElement, HTMLLIElement>();

  const onImageIntersect = useCallback(
    (_element: Element, intersectId: string) => {
      dispatch({ type: "SELECT_IMAGE", payload: intersectId });
    },
    [dispatch],
  );

  const handleDropzoneFilesChange = (files: FileList) => {
    // Convert FileList to ChangeEvent format for compatibility
    const mockEvent = {
      target: { files },
    } as ChangeEvent<HTMLInputElement>;
    void filesChangeAction(mockEvent);
  };

  return (
    <div className="relative">
      <div
        className="hide-scrollbar h-[200px] snap-x snap-mandatory overflow-x-auto scroll-smooth rounded"
        ref={scrollContainerRef}
      >
        {images.length === 0 && (
          <ImageUpload onChange={handleDropzoneFilesChange}>
            {({
              handleDragOver,
              handleDrop,
              handleFileChange: _handleFileChange,
            }) => (
              <Dropzone handleDragOver={handleDragOver} handleDrop={handleDrop}>
                <DropzoneContent id="image-upload">
                  <ImagePlus />
                  <p className="text-xs leading-tight">Drop images or click</p>
                  <Input
                    ref={imageInputRef}
                    id="image-upload"
                    type="file"
                    onChange={filesChangeAction}
                    multiple
                    accept="image/*"
                    className="sr-only"
                  />
                </DropzoneContent>
              </Dropzone>
            )}
          </ImageUpload>
        )}
        {images.length > 0 && (
          <ul className="flex h-full">
            {images.map((image) => {
              return (
                <li
                  key={image.id}
                  ref={setImageElementRef(image.id)}
                  className="w-full flex-shrink-0 flex-grow snap-center"
                >
                  <ScrollableImageContainer<HTMLImageElement>
                    threshold={0.6}
                    id={image.id}
                    onIntersect={onImageIntersect}
                  >
                    {({ ref }) => (
                      <ImageRenderer
                        showErrorText={true}
                        image={image}
                        ref={ref}
                      />
                    )}
                  </ScrollableImageContainer>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

type ImageProps = {
  image: PostFormImage;
  showErrorText?: boolean;
  ref?: RefObject<HTMLImageElement | null>;
};

const ImageRenderer = React.forwardRef<
  HTMLImageElement,
  Omit<ImageProps, "ref">
>(function ImageRenderer({ image, showErrorText = false }, ref) {
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
        ref={ref}
        src={`/api/image/${image.key}`}
        className="pointer-events-none h-full w-full object-cover"
        alt={image.name}
      />
    );
  }

  if (image.type === "compression_error") {
    return (
      <div
        ref={ref}
        className="h-full w-full content-center items-center bg-red-200 p-2 text-center"
      >
        {showErrorText && (
          <p>There was a problem uploading image: {stripUuid(image.name)}</p>
        )}
      </div>
    );
  }

  return <Skeleton ref={ref} className="h-full w-full" />;
});

type ImageContainerProps<U extends Element> = {
  id: string;
  children: ({ ref }: { ref: (node: U | null) => void }) => React.ReactNode;
  onIntersect: (element: Element, intersectionId: string) => void;
  threshold?: number;
  rootMargin?: string;
};

function ScrollableImageContainer<U extends Element>({
  id,
  children,
  onIntersect,
  threshold = 0,
  rootMargin,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    useImageScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (element: Element) => {
        onIntersect(element, id);
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
