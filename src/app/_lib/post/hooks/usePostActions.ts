import { useCallback, type ChangeEvent } from "react";
import type {
  PostFormUploadingImage,
  PostForm as Post,
} from "~/server/lib/types";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { useToast } from "../../ui/use-toast";

import { useQueryClient } from "@tanstack/react-query";
import { usePosts } from "../contexts/PostsContext";
import { MAX_IMAGES_PER_POST } from "~/server/lib/schema";

export { MAX_IMAGES_PER_POST };

export type PostActions = {
  filesChangeAction: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  titleChangeAction: (value: string) => void;
  descriptionChangeAction: (value: string) => void;
  startNewPostAction: () => void;
  editPostAction: (post: Post) => void;
  deletePostAction: () => void;
  imageSelectAction: (imageId: string) => void;
  imageIntersectAction: (imageId: string) => void;
  swapPostByIdAction: (activeId: string, overId: string) => void;
  postIntersectAction: (postId: string) => void;
  nextPostAction: () => void;
  previousPostAction: () => void;
  nextImageAction: () => void;
  previousImageAction: () => void;
};

export function usePostActions(): PostActions {
  const { state, dispatch } = usePosts();
  const api = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams();
  const { toast } = useToast();

  async function filesChangeAction(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedPost = state.posts.find((post) => post.isSelected)!;
    const currentImageCount = selectedPost.images.length;
    const availableSlots = MAX_IMAGES_PER_POST - currentImageCount;

    if (availableSlots <= 0) {
      toast({
        title: `Maximum ${MAX_IMAGES_PER_POST} images per post`,
        description: "Delete some images to add more.",
      });
      return;
    }

    // Limit files to available slots
    const filesToAdd = Array.from(files).slice(0, availableSlots);
    if (filesToAdd.length < files.length) {
      toast({
        title: `Only adding ${filesToAdd.length} of ${files.length} images`,
        description: `Maximum ${MAX_IMAGES_PER_POST} images per post.`,
      });
    }

    const metadata = filesToAdd.map((file) => ({
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
          toast({ title: "Unable to add file " + filesToAdd[index]!.name });
          return Promise.reject(
            item.reason instanceof Error ? item.reason : new Error(),
          );
        }

        const formData = new FormData();
        for (const [key, value] of Object.entries(item.value.fields)) {
          formData.append(key, value);
        }
        formData.append("file", filesToAdd[index]!);

        return fetch(item.value.url, {
          method: "post",
          body: formData,
        });
      }),
    );

    dispatch({ type: "ADD_IMAGES", payload });
  }

  function titleChangeAction(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { title: value } },
    });
  }

  function descriptionChangeAction(value: string) {
    dispatch({
      type: "UPDATE_POST",
      payload: { updates: { description: value } },
    });
  }

  function startNewPostAction() {
    dispatch({ type: "START_NEW_POST" });
  }

  function editPostAction(post: Post) {
    dispatch({ type: "START_EDITING", payload: post.id });
  }

  function deletePostAction() {
    dispatch({ type: "DELETE_CURRENT_POST" });
  }

  function imageSelectAction(imageId: string) {
    dispatch({ type: "SELECT_IMAGE", payload: imageId });
  }

  function swapPostByIdAction(activeId: string, overId: string) {
    dispatch({
      type: "REORDER_POSTS",
      payload: { activeId: activeId, overId: overId },
    });
  }

  const postIntersectAction = useCallback(
    (postId: string) => {
      dispatch({ type: "START_EDITING", payload: postId });
    },
    [dispatch],
  );

  function nextPostAction() {
    dispatch({ type: "SELECT_NEXT_POST" });
  }

  function previousPostAction() {
    dispatch({ type: "SELECT_PREVIOUS_POST" });
  }

  function nextImageAction() {
    dispatch({ type: "SELECT_NEXT_IMAGE" });
  }

  function previousImageAction() {
    dispatch({ type: "SELECT_PREVIOUS_IMAGE" });
  }

  const imageIntersectAction = useCallback(
    (imageId: string) => {
      dispatch({ type: "SELECT_IMAGE", payload: imageId });
    },
    [dispatch],
  );

  return {
    filesChangeAction,
    titleChangeAction,
    descriptionChangeAction,
    startNewPostAction,
    editPostAction,
    deletePostAction,
    imageSelectAction,
    imageIntersectAction,
    swapPostByIdAction,
    postIntersectAction,
    nextPostAction,
    previousPostAction,
    nextImageAction,
    previousImageAction,
  };
}
