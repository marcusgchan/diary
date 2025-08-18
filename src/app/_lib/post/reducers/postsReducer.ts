//TODO:invarirant with post length cannot be empty (refactor deleate and maybe others)

import { type RouterOutputs } from "~/server/trpc";
import type {
  ImageErrorState,
  ImageLoadedState,
  ImageUploadingState,
  EditPostGroupByNonEmptyImages,
  EditPostGroupByImages,
} from "~/server/features/diary/types";

export type Image = ImageLoadedState | ImageUploadingState | ImageErrorState;

export type Post = EditPostGroupByImages;

export type PostsState = {
  posts: EditPostGroupByImages[];
  imageKeyToImageId: Map<NonNullable<Image["key"]>, Image["id"]>;
};

export type PostsAction =
  | { type: "LOAD_POSTS"; payload: EditPostGroupByNonEmptyImages[] }
  | { type: "START_NEW_POST" }
  | { type: "START_EDITING"; payload: string }
  | {
      type: "UPDATE_POST";
      payload: { updates: Partial<EditPostGroupByNonEmptyImages> };
    }
  | { type: "ADD_IMAGES"; payload: ImageUploadingState[] }
  | { type: "SELECT_IMAGE"; payload: string }
  | { type: "DELETE_CURRENT_POST" }
  | { type: "REORDER_POSTS"; payload: { activeId: string; overId: string } }
  | {
      type: "REORDER_IMAGES";
      payload: { activeImageId: string; overImageId: string };
    }
  | {
      type: "UPDATE_IMAGES_STATUS";
      payload: RouterOutputs["diary"]["getMultipleImageUploadStatus"];
    }
  | { type: "DELETE_CURRENT_IMAGE"; payload: { imageId: string } };

const emptyPost: Omit<EditPostGroupByNonEmptyImages, "id" | "order"> = {
  images: [],
  title: "",
  isSelected: true,
  description: "",
};

const createNewEmptyPost = (order = 0) => ({
  ...emptyPost,
  id: crypto.randomUUID(),
  order,
});

const firstPost = createNewEmptyPost(0);

export const initialState: PostsState = {
  posts: [firstPost],
  imageKeyToImageId: new Map(),
};

export function postsReducer(
  state: PostsState,
  action: PostsAction,
): PostsState {
  switch (action.type) {
    case "LOAD_POSTS": {
      console.log("loading");
      return { ...state, posts: action.payload };
    }
    case "START_NEW_POST": {
      const maxOrder = Math.max(...state.posts.map((p) => p.order), -1);
      const newPostToSelect = createNewEmptyPost(maxOrder + 1);
      const updatedState = {
        ...state,
        posts: [
          ...state.posts.map((post) => ({ ...post, isSelected: false })),
          newPostToSelect,
        ],
      };
      console.log("start", updatedState);
      return updatedState;
    }

    // Invariant: Post guaranteed to exist
    case "START_EDITING": {
      return {
        ...state,
      };
    }

    case "UPDATE_POST":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.isSelected ? { ...post, ...action.payload.updates } : post,
        ),
      };

    case "ADD_IMAGES": {
      action.payload.forEach((image) =>
        state.imageKeyToImageId.set(image.key, image.id),
      );

      return {
        ...state,
        posts: state.posts.map((post) => {
          if (post.isSelected) {
            const currentImageCount = post.images.length;
            const imagesWithOrder = action.payload.map((image, index) => ({
              ...image,
              isSelected: post.images.length === 0 && index === 0,
              order: currentImageCount + index,
            }));

            return { ...post, images: [...post.images, ...imagesWithOrder] };
          }
          return post;
        }),
      };
    }

    case "SELECT_IMAGE": {
      return {
        ...state,
        posts: state.posts.map((post) => {
          if (post.isSelected) {
            return {
              ...post,
              images: post.images.map((image) =>
                image.id === action.payload
                  ? { ...image, isSelected: true }
                  : { ...image, isSelected: false },
              ),
            };
          }
          return post;
        }),
      };
    }

    case "DELETE_CURRENT_POST": {
      const remainingPosts = state.posts.filter((p) => !p.isSelected);
      if (remainingPosts.length === 0) {
        const newPost = createNewEmptyPost();
        return {
          ...state,
          posts: [newPost],
        };
      }

      return {
        ...state,
        posts: remainingPosts,
      };
    }

    case "REORDER_POSTS": {
      const { activeId, overId } = action.payload;
      const updatedPosts = [...state.posts];
      const activeIndex = updatedPosts.findIndex((p) => p.id === activeId);
      const overIndex = updatedPosts.findIndex((p) => p.id === overId);

      if (activeIndex !== -1 && overIndex !== -1) {
        const [activePost] = updatedPosts.splice(activeIndex, 1);
        if (activePost) {
          updatedPosts.splice(overIndex, 0, activePost);
        }
      }

      // Update order values to reflect new positions
      const postsWithUpdatedOrder = updatedPosts.map((post, index) => ({
        ...post,
        order: index,
      }));

      return {
        ...state,
        posts: postsWithUpdatedOrder,
      };
    }

    case "REORDER_IMAGES": {
      const { activeImageId, overImageId } = action.payload;
      const updatedPosts = state.posts.map((post) => {
        if (post.isSelected) {
          const images = [...post.images];
          const activeIndex = images.findIndex(
            (img) => img.id === activeImageId,
          );
          const overIndex = images.findIndex((img) => img.id === overImageId);

          if (activeIndex !== -1 && overIndex !== -1) {
            const [activeImage] = images.splice(activeIndex, 1);
            if (activeImage) {
              images.splice(overIndex, 0, activeImage);
            }
          }

          // Update order values to reflect new positions
          const imagesWithUpdatedOrder = images.map((image, index) => ({
            ...image,
            order: index,
          }));

          return { ...post, images: imagesWithUpdatedOrder };
        }
        return post;
      });

      return {
        ...state,
        posts: updatedPosts,
      };
    }

    case "UPDATE_IMAGES_STATUS": {
      state.posts.forEach((post) => {
        post.images.forEach((image, i) => {
          const imagePayload = action.payload.get(image.id);
          if (!imagePayload) {
            return;
          }

          if (imagePayload.type === "success") {
            const newImage = {
              ...(image as ImageUploadingState),
              type: "loaded",
              url: imagePayload.url,
            } satisfies ImageLoadedState;
            post.images[i] = newImage;
            state.imageKeyToImageId.delete(newImage.key);
          }
        });
      });
      return {
        ...state,
      };
    }

    case "DELETE_CURRENT_IMAGE": {
      const { imageId } = action.payload;

      const newImageKeyToImageId = new Map<string, string>();
      for (const [key, value] of state.imageKeyToImageId.entries()) {
        if (value !== imageId) {
          newImageKeyToImageId.set(key, value);
        }
      }

      return {
        imageKeyToImageId: newImageKeyToImageId,
        posts: state.posts.map((post) => {
          if (post.isSelected) {
            const filteredImages = post.images.filter(
              (img) => img.id !== imageId,
            );
            if (filteredImages[0]?.isSelected) {
              filteredImages[0].isSelected = true;
            }

            return {
              ...post,
              images: filteredImages,
            };
          }
          return post;
        }),
      };
    }

    default:
      throw new Error("Invalid PostsAction in postsReducer");
  }
}
