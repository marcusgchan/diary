import { type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import type {
  PostsState,
  PostsAction,
} from "@/_lib/post/reducers/postsReducer";
import type {
  PostFormUploadingImage,
  PostForm as Post,
} from "~/server/lib/types";
import { type useScrollToImage } from "./useScrollToImage";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { useToast } from "../../ui/use-toast";

import { useQueryClient } from "@tanstack/react-query";

type ScrollToImage = ReturnType<typeof useScrollToImage>["scrollToImage"];

export type PostActions = {
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleStartNewPost: () => void;
  handleEditPost: (post: Post, scrollToImage: ScrollToImage) => void;
  handleDeletePost: () => void;
  handleImageSelect: (imageId: string, scrollToImage: ScrollToImage) => void;
};

type UsePostActionsParams = {
  dispatch: React.Dispatch<PostsAction>;
  state: PostsState;
};

export function usePostActions({
  dispatch,
  state,
}: UsePostActionsParams): PostActions {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams();
  const { toast } = useToast();

  async function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const metadata = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      mimetype: file.type,
    }));

    const diaryId = Number(params.diaryId);
    const entryId = Number(params.entryId);

    const res = await Promise.allSettled(
      metadata.map(async (meta) => {
        const data = queryClient.fetchQuery(
          api.diary.createPresignedPostUrl.queryOptions(
            {
              diaryId,
              entryId,
              imageMetadata: meta,
            },
            { staleTime: 0 },
          ),
        );
        return data;
      }),
    );

    const selectedPost = state.posts.find((post) => post.isSelected)!;

    const payload: PostFormUploadingImage[] = res
      .filter((res) => res.status === "fulfilled")
      .map((res, index) => {
        const meta = metadata[index]!;
        return {
          type: "uploading" as const,
          id: crypto.randomUUID(),
          name: meta.name,
          size: meta.size,
          mimetype: meta.mimetype,
          order: index,
          key: res.value.key,
          isSelected: selectedPost.images.length === 0 && index === 0,
        } satisfies PostFormUploadingImage;
      });

    await Promise.allSettled(
      res.map((item, index) => {
        if (item.status === "rejected") {
          toast({ title: "Unable to add file " + files[index]!.name });
          return Promise.reject(
            item.reason instanceof Error ? item.reason : new Error(),
          );
        }

        const formData = new FormData();
        for (const [key, value] of Object.entries(item.value.fields)) {
          formData.append(key, value);
        }
        formData.append("file", files[index]!);

        return fetch(item.value.url, {
          method: "post",
          body: formData,
        });
      }),
    );

    dispatch({ type: "ADD_IMAGES", payload });
  }

  function handleTitleChange(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { title: value } },
    });
  }

  function handleDescriptionChange(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { description: value } },
    });
  }

  function handleStartNewPost() {
    dispatch({ type: "START_NEW_POST" });
  }

  function handleEditPost(post: Post, scrollToImage: ScrollToImage) {
    flushSync(() => {
      dispatch({ type: "START_EDITING", payload: post.id });
    });

    const firstImage = post.images[0];

    if (!firstImage) {
      throw new Error("invariant: must have at least one image in post");
    }

    scrollToImage(firstImage.id, true);
  }

  function handleDeletePost() {
    dispatch({ type: "DELETE_CURRENT_POST" });
  }

  function handleImageSelect(imageId: string, scrollToImage: ScrollToImage) {
    dispatch({ type: "SELECT_IMAGE", payload: imageId });
    scrollToImage(imageId);
  }

  return {
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleStartNewPost,
    handleEditPost,
    handleDeletePost,
    handleImageSelect,
  };
}
