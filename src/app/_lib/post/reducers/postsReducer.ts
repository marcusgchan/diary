import { type RouterOutputs } from "~/server/trpc";
import type {
  ImageErrorState,
  ImageLoadedState,
  ImageUploadingState,
  EditPostGroupByNonEmptyImages,
  EditPostGroupByImages,
} from "~/server/lib/types";

export type Image = ImageLoadedState | ImageUploadingState | ImageErrorState;
export type { ImageUploadingState };

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
      console.log("loading post state", state);
      return { ...state, posts: action.payload, imageKeyToImageId: new Map() };
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
      return updatedState;
    }

    // Invariant: Post guaranteed to exist
    case "START_EDITING": {
      const updatedState = {
        ...state,
        posts: state.posts.map((post) => {
          if (action.payload === post.id) {
            return {
              ...post,
              images: post.images.map((image, index) => {
                if (index === 0) {
                  return { ...image, isSelected: true };
                }
                return { ...image };
              }),
              isSelected: true,
            };
          } else {
            return {
              ...post,
              isSelected: false,
              images: post.images.map((image) => ({
                ...image,
                isSelected: false,
              })),
            };
          }
        }),
      };
      return updatedState;
    }

    case "UPDATE_POST":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.isSelected ? { ...post, ...action.payload.updates } : post,
        ),
      };

    case "ADD_IMAGES": {
      const newImageKeyToImageId = new Map(state.imageKeyToImageId);
      action.payload.forEach((image) =>
        newImageKeyToImageId.set(image.key, image.id),
      );

      return {
        ...state,
        imageKeyToImageId: newImageKeyToImageId,
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
      const remainingPosts = state.posts
        .filter((p) => !p.isSelected)
        .map((post, index) => {
          if (index === 0) {
            return {
              ...post,
              isSelected: true,
              images: post.images.map((image, imageIndex) => {
                if (imageIndex === 0) {
                  return {
                    ...image,
                    isSelected: true,
                  };
                }

                return {
                  ...image,
                };
              }),
            };
          }

          return {
            ...post,
            images: post.images.map((image) => ({ ...image })),
          };
        });

      const imageIds = state.posts
        .find((post) => post.isSelected)!
        .images.map((image) => image.id);
      const newImageKeyToImageId = new Map<string, string>();
      for (const [key, value] of state.imageKeyToImageId.entries()) {
        if (imageIds.includes(value)) {
          newImageKeyToImageId.set(key, value);
        }
      }

      if (remainingPosts.length === 0) {
        const newPost = createNewEmptyPost();

        return {
          ...state,
          imageKeyToImageId: newImageKeyToImageId,
          posts: [newPost],
        };
      }

      return {
        ...state,
        imageKeyToImageId: newImageKeyToImageId,
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
      const newImageKeyToImageId = new Map(state.imageKeyToImageId);

      const updatedPosts = state.posts.map((post) => {
        const updatedImages = post.images.map((image) => {
          const imagePayload = action.payload.get(image.id);
          if (!imagePayload) {
            return image;
          }

          if (imagePayload.type === "success") {
            const newImage = {
              ...(image as ImageUploadingState),
              type: "loaded",
              url: imagePayload.url,
            } satisfies ImageLoadedState;
            newImageKeyToImageId.delete(newImage.key);
            return newImage;
          } else if (imagePayload.type === "compression_failure") {
            const newImage = {
              ...(image as ImageUploadingState),
              type: "loaded",
              url: imagePayload.url,
            } satisfies ImageLoadedState;
            newImageKeyToImageId.delete(newImage.key);
            return newImage;
          } else {
            const newImage = {
              ...(image as ImageErrorState),
              type: "error",
            } satisfies ImageErrorState;
            // Remove key from map for error state
            for (const [key, value] of newImageKeyToImageId.entries()) {
              if (value === image.id) {
                newImageKeyToImageId.delete(key);
              }
            }
            return newImage;
          }
        });

        return { ...post, images: updatedImages };
      });

      // Clean up any orphaned keys - remove keys for images that are no longer uploading
      const allCurrentImageIds = new Set(
        updatedPosts.flatMap((post) =>
          post.images
            .filter((img) => img.type === "uploading")
            .map((img) => img.id),
        ),
      );

      for (const [key, imageId] of newImageKeyToImageId.entries()) {
        if (!allCurrentImageIds.has(imageId)) {
          newImageKeyToImageId.delete(key);
        }
      }

      return {
        ...state,
        posts: updatedPosts,
        imageKeyToImageId: newImageKeyToImageId,
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
