"use client";
import { Image as ImageIcon, MapPin, Trash, X } from "lucide-react";
import React, { useRef, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { usePostActions } from "../hooks/usePostActions";
import { ImageScrollTrackingContextProvider } from "../contexts/ImageScrollTrackingContext";
import { usePosts } from "../contexts/PostsContext";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";

import { useQuery } from "@tanstack/react-query";
import { PostsHeaderDnd } from "./PostsHeaderDnd";
import { PostImageCarousel } from "./PostImageCarousel";
import { PostImageThumbnails } from "./PostImageThumbnails";

export function EditPosts() {
  return (
    <ImageScrollTrackingContextProvider<HTMLDivElement, HTMLLIElement>>
      <SelectedPostViewContent />
    </ImageScrollTrackingContextProvider>
  );
}

function SelectedPostViewContent() {
  const api = useTRPC();
  const { state, dispatch } = usePosts();

  const {
    handleStartNewPost,
    handleDeletePost,
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
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
        <Button type="button" variant="outline" onClick={handleStartNewPost}>
          Add
        </Button>
      </div>

      <PostsHeaderDnd />

      <Separator />

      <PostImageCarousel />

      <PostImageThumbnails />

      <Separator />

      {selectedPostForm.images.length > 0 && (
        <>
          <button
            type="button"
            className="text-md flex gap-1 text-muted-foreground"
            onClick={() => selectNewImage()}
          >
            <ImageIcon />
            Add New Images
          </button>
          <input
            ref={imageInputRef}
            type="file"
            onChange={handleFilesChange}
            multiple
            accept="image/*"
            className="sr-only"
          />
          <Separator />
        </>
      )}
      {!!selectedImage && (
        <button
          type="button"
          className="text-md flex gap-1 text-muted-foreground"
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
      <Separator />
      <button type="button" className="flex gap-1 text-muted-foreground">
        <MapPin />
        Edit Images Location
      </button>
      <Separator />
      <Input
        placeholder="Title..."
        value={selectedPostForm.title}
        onChange={(e) => handleTitleChange(e.target.value)}
      />
      <Textarea
        placeholder="Description..."
        className="h-[100px] resize-none p-2"
        value={selectedPostForm.description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
      />
      <div className="flex items-center">
        {state.posts.length > 1 && (
          <Button
            onClick={handleDeletePost}
            variant="destructive"
            type="button"
          >
            <Trash />
          </Button>
        )}
      </div>
    </div>
  );
}
