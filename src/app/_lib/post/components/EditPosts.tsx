"use client";
import { Image as ImageIcon, X } from "lucide-react";
import React, { useRef, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { usePostActions } from "../hooks/usePostActions";
import { ImageScrollTrackingContextProvider } from "../contexts/ImageScrollTrackingContext";
import { usePosts } from "../contexts/PostsContext";
import { PostListScrollTrackingContextProvider } from "../contexts/PostListScrollTrackingContext";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";

import { useQuery } from "@tanstack/react-query";
import { PostsHeaderDnd } from "./PostsHeaderDnd";
import { PostImageCarousel as SelectedImage } from "./PostImageCarousel";
import { PostImageThumbnails } from "./PostImageThumbnails";
import { LocationDisplay } from "./LocationDrawer";

type EditPostsProps = {
  footer?: React.ReactNode;
  deleteButton?: React.ReactNode;
};

export function EditPosts({ footer, deleteButton }: EditPostsProps) {
  return (
    <PostListScrollTrackingContextProvider>
      <ImageScrollTrackingContextProvider<HTMLDivElement, HTMLLIElement>>
        <SelectedPostViewContent footer={footer} deleteButton={deleteButton} />
      </ImageScrollTrackingContextProvider>
    </PostListScrollTrackingContextProvider>
  );
}

function SelectedPostViewContent({
  footer,
  deleteButton,
}: {
  footer?: React.ReactNode;
  deleteButton?: React.ReactNode;
}) {
  const api = useTRPC();
  const { state, dispatch } = usePosts();

  const {
    startNewPostAction,
    filesChangeAction,
    titleChangeAction,
    descriptionChangeAction,
  } = usePostActions();

  const selectedPostForm = state.posts.find((post) => post.isSelected)!;

  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);
  const { data: uploadingState } = useQuery(
    api.diary.getMultipleImageUploadStatus.queryOptions(
      {
        entryId,
        diaryId,
        keys: Array.from(state.imageKeyToImageId.keys()),
        keyToIdMap: state.imageKeyToImageId,
      },
      {
        enabled: state.imageKeyToImageId.size > 0,
        refetchInterval: 3000,
      },
    ),
  );
  useEffect(() => {
    if (!uploadingState) {
      return;
    }
    dispatch({ type: "UPDATE_IMAGES_STATUS", payload: uploadingState });
  }, [uploadingState, dispatch]);

  const selectedImage = selectedPostForm.images.find(
    (image) => image.isSelected,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  function selectNewImage() {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-2 rounded-xl bg-card p-6 text-card-foreground">
      <div className="flex items-center justify-between self-stretch">
        <h3>Posts</h3>
        <Button type="button" variant="outline" onClick={startNewPostAction}>
          Add
        </Button>
      </div>

      <PostsHeaderDnd />

      <Separator />

      <LocationDisplay />

      <SelectedImage />

      <PostImageThumbnails />

      <Separator />

      {selectedPostForm.images.length > 0 && (
        <>
          <button
            type="button"
            className="text-md flex gap-1 py-1 text-muted-foreground"
            onClick={() => selectNewImage()}
          >
            <ImageIcon />
            Add New Images
          </button>
          <input
            ref={imageInputRef}
            type="file"
            onChange={filesChangeAction}
            multiple
            accept="image/*"
            className="sr-only"
          />
        </>
      )}
      {!!selectedImage && (
        <button
          type="button"
          className="text-md flex gap-1 py-1 text-muted-foreground"
          onClick={() => {
            dispatch({
              type: "DELETE_CURRENT_IMAGE",
              payload: { imageId: selectedImage.id },
            });
          }}
        >
          <X />
          Delete Image
        </button>
      )}

      <Input
        placeholder="Title..."
        value={selectedPostForm.title}
        onChange={(e) => titleChangeAction(e.target.value)}
      />
      <Textarea
        placeholder="Description..."
        className="h-[100px] resize-none p-2"
        value={selectedPostForm.description}
        onChange={(e) => descriptionChangeAction(e.target.value)}
      />

      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
      {(footer || deleteButton) && (
        <div className="flex items-center justify-between">
          <div>{deleteButton}</div>
          <div>{footer}</div>
        </div>
      )}
    </div>
  );
}
