import { type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import type {
  Post,
  PostsState,
  PostsAction,
  ImageUploadingState,
  ImageErrorState,
} from "@/_lib/post/reducers/postsReducer";
import { type useScrollToImage } from "./useScrollToImage";
import { api } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";

export type PostActions = {
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleStartNewPost: () => void;
  handleEditPost: (post: Post) => void;
  handleDeletePost: () => void;
  handleImageSelect: (imageId: string) => void;
};

type ScrollToImage = ReturnType<typeof useScrollToImage>["scrollToImage"];

type UsePostActionsParams = {
  dispatch: React.Dispatch<PostsAction>;
  state: PostsState;
  scrollToImage: ScrollToImage;
};

export function usePostActions({
  dispatch,
  state,
  scrollToImage,
}: UsePostActionsParams): PostActions {
  const utils = api.useUtils();
  const params = useParams();

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
        const data = utils.diary.createPresignedPostUrl.fetch(
          {
            diaryId,
            entryId,
            imageMetadata: meta,
          },
          { staleTime: 0 },
        );
        return data;
      }),
    );

    const payload: ImageUploadingState[] = res
      .filter((res) => res.status === "fulfilled")
      .map((res, index) => {
        const meta = metadata[index]!;
        return {
          type: "uploading" as const,
          id: crypto.randomUUID(),
          name: meta.name,
          size: meta.size,
          mimetype: meta.mimetype,
          order: index + 1,
          key: res.value.key,
        } satisfies ImageUploadingState;
      });

    await Promise.allSettled(
      res.map((item, index) => {
        if (item.status === "rejected") {
          return Promise.reject(new Error(item.reason));
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

  function handleEditPost(post: Post) {
    flushSync(() => {
      dispatch({ type: "START_EDITING", payload: post.id });
    });

    const selectedImageId =
      state.postImageSelections.get(post.id) ?? post.images[0]?.id;

    if (selectedImageId) {
      scrollToImage(selectedImageId, true);
    }
  }

  function handleDeletePost() {
    dispatch({ type: "DELETE_POST" });
  }

  function handleImageSelect(imageId: string) {
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
