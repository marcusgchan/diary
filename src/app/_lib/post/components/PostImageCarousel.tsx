"use client";
import { ImagePlus } from "lucide-react";
import React, { type ChangeEvent, type RefObject, useRef } from "react";
import { Input } from "../../ui/input";
import {
  ImageUpload,
  Dropzone,
  DropzoneContent,
} from "@/_lib/shared/components/ImageUpload";
import { Skeleton } from "../../ui/skeleton";
import { usePosts } from "../contexts/PostsContext";
import { usePostActions } from "../hooks/usePostActions";
import type { PostFormImage } from "~/server/lib/types";

export function PostImageCarousel() {
  const { state } = usePosts();
  const { filesChangeAction } = usePostActions();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedPostForm = state.posts.find((post) => post.isSelected)!;
  const images = selectedPostForm.images;
  const selectedImage = images.find((image) => image.isSelected);

  const handleDropzoneFilesChange = (files: FileList) => {
    // Convert FileList to ChangeEvent format for compatibility
    const mockEvent = {
      target: { files },
    } as ChangeEvent<HTMLInputElement>;
    void filesChangeAction(mockEvent);
  };

  return (
    <div className="relative">
      <div className="h-[200px] rounded">
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
        {selectedImage && (
          <div className="h-full w-full">
            <ImageRenderer showErrorText={true} image={selectedImage} />
          </div>
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
        className="pointer-events-none h-full w-full rounded object-cover"
        alt={image.name}
      />
    );
  }

  if (image.type === "compression_error") {
    return (
      <div
        ref={ref}
        className="h-full w-full content-center items-center rounded bg-red-200 p-2 text-center"
      >
        {showErrorText && (
          <p>There was a problem uploading image: {stripUuid(image.name)}</p>
        )}
      </div>
    );
  }

  return <Skeleton className="h-full w-full rounded" />;
});
