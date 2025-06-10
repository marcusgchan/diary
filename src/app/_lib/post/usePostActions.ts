import { type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import type { Post, PostsState, PostsAction } from "./postsReducer";
import { type useScrollToImage } from "./useScrollToImage";

type PostActions = {
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleTitleChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  handleStartNewPost: () => void;
  handleEditPost: (post: Post) => void;
  handleDeletePost: () => void;
};

type ScrollToPost = ReturnType<typeof useScrollToImage>["scrollToImage"];

type UsePostActionsParams = {
  dispatch: React.Dispatch<PostsAction>;
  state: PostsState;
  scrollToPost: ScrollToPost;
};

export function usePostActions({
  dispatch,
  state,
  scrollToPost,
}: UsePostActionsParams): PostActions {
  async function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const success: Post["images"] = [];
    const failed = [];
    for (const file of files) {
      const { name, type, size } = file;
      await new Promise<void>((resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
          const dataUrl = fileReader.result as string;
          const id = crypto.randomUUID();
          success.push({
            id,
            name,
            type,
            size,
            dataUrl,
            order: 0, // Placeholder, will be set properly in reducer
          });
          resolve();
        };
        fileReader.onerror = () => {
          failed.push({ name, type, size, error: fileReader.error });
          resolve();
        };
      });
    }
    dispatch({ type: "ADD_IMAGES", payload: success });
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
      scrollToPost(selectedImageId, true);
    }
  }

  function handleDeletePost() {
    dispatch({ type: "DELETE_POST" });
  }

  return {
    handleFilesChange,
    handleTitleChange,
    handleDescriptionChange,
    handleStartNewPost,
    handleEditPost,
    handleDeletePost,
  };
}
