//TODO:invarirant with post length cannot be empty (refactor deleate and maybe others)
export type Post = {
  id: string;
  title: string;
  description: string;
  order: number;
  images: {
    id: string;
    dataUrl: string;
    name: string;
    type: string;
    size: number;
    order: number;
  }[];
};

type PostsState = {
  posts: Post[];
  selectedPostId: string;
  postImageSelections: Map<string, string | null>;
};

type PostsAction =
  | { type: "START_NEW_POST" }
  | { type: "START_EDITING"; payload: string }
  | { type: "SAVE_POST" }
  | { type: "UPDATE_POST"; payload: { updates: Partial<Post> } }
  | { type: "ADD_IMAGES"; payload: Post["images"] }
  | { type: "CANCEL_EDITING" }
  | { type: "SELECT_IMAGE"; payload: string }
  | { type: "DELETE_POST" }
  | { type: "REORDER_POSTS"; payload: { activeId: string; overId: string } }
  | { type: "REORDER_IMAGES"; payload: { activeImageId: string; overImageId: string } };

const emptyPost: Omit<Post, "id" | "order"> = {
  images: [],
  title: "",
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
  selectedPostId: firstPost.id,
  postImageSelections: new Map(),
};

export function postsReducer(state: PostsState, action: PostsAction): PostsState {
  const currentSelectedPost = state.posts.find(p => p.id === state.selectedPostId)!;

  switch (action.type) {
    case "START_NEW_POST": {
      const maxOrder = Math.max(...state.posts.map(p => p.order), -1);
      const newPostToSelect = createNewEmptyPost(maxOrder + 1);

      return {
        posts: [...state.posts, newPostToSelect],
        selectedPostId: newPostToSelect.id,
        postImageSelections: new Map(state.postImageSelections),
      };
    }

    case "START_EDITING": {
      const postIdToEdit = action.payload;
      
      if (currentSelectedPost.id === postIdToEdit) {
        return state;
      }

      let updatedPosts = state.posts;
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        updatedPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
      }

      const newPostToFocus = updatedPosts.find(p => p.id === postIdToEdit);
      
      // Check if current selectedImageId is valid for the new post
      let newSelectedImageId = state.postImageSelections.get(postIdToEdit) ?? null;
      if (newPostToFocus && newSelectedImageId) {
        const imageExists = newPostToFocus.images.some(img => img.id === newSelectedImageId);
        if (!imageExists) {
          // If current selected image doesn't exist in new post, select first image or null
          newSelectedImageId = newPostToFocus.images[0]?.id ?? null;
        }
      } else if (newPostToFocus && !newSelectedImageId) {
        // If no image was selected, select first image of new post
        newSelectedImageId = newPostToFocus.images[0]?.id ?? null;
      }

      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(postIdToEdit, newSelectedImageId);

      return {
        posts: updatedPosts,
        selectedPostId: postIdToEdit,
        postImageSelections: newPostImageSelections,
      };
    }

    case "SAVE_POST": {
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
        const lastPost = remainingPosts[remainingPosts.length - 1]!;
        const newPostImageSelections = new Map(state.postImageSelections);
        newPostImageSelections.set(lastPost.id, lastPost.images[0]?.id ?? null);
        return {
          posts: remainingPosts,
          selectedPostId: lastPost.id,
          postImageSelections: newPostImageSelections,
        };
      }

      const maxOrder = Math.max(...state.posts.map(p => p.order), -1);
      const newPost = createNewEmptyPost(maxOrder + 1);
      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(newPost.id, null);
      return {
        ...state, 
        posts: [...state.posts, newPost],
        selectedPostId: newPost.id,
        postImageSelections: newPostImageSelections,
      };
    }

    case "UPDATE_POST":
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === state.selectedPostId
            ? { ...post, ...action.payload.updates }
            : post
        ),
      };

    case "ADD_IMAGES": {
      let newSelectedImageId = state.postImageSelections.get(state.selectedPostId) ?? null;
      if (action.payload.length > 0 && !state.postImageSelections.get(state.selectedPostId) && currentSelectedPost.images.length === 0) {
        newSelectedImageId = action.payload[0]?.id ?? null;
      }
      
      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(state.selectedPostId, newSelectedImageId);
      
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === state.selectedPostId) {
            const currentImageCount = post.images.length;
            const imagesWithOrder = action.payload.map((image, index) => ({
              ...image,
              order: currentImageCount + index,
            }));
            
            return { ...post, images: [...post.images, ...imagesWithOrder] };
          }
          return post;
        }),
        postImageSelections: newPostImageSelections,
      };
    }

    case "SELECT_IMAGE": {
      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(state.selectedPostId, action.payload);
      return {
        ...state,
        postImageSelections: newPostImageSelections,
      };
    }

    case "CANCEL_EDITING": {
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
        const lastPost = remainingPosts[remainingPosts.length - 1]!;
        const newPostImageSelections = new Map(state.postImageSelections);
        newPostImageSelections.set(lastPost.id, lastPost.images[0]?.id ?? null);
        return {
          posts: remainingPosts,
          selectedPostId: lastPost.id,
          postImageSelections: newPostImageSelections,
        };
      }
      const maxOrder = Math.max(...state.posts.map(p => p.order), -1);
      const newPost = createNewEmptyPost(maxOrder + 1);
      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(newPost.id, null);
      return {
        ...state,
        posts: [...state.posts, newPost],
        selectedPostId: newPost.id,
        postImageSelections: newPostImageSelections,
      };
    }

    case "DELETE_POST": {
      if (state.posts.length === 1) {
        // If only one post, replace it with a new empty post
        const newPost = createNewEmptyPost(0);
        return {
          posts: [newPost],
          selectedPostId: newPost.id,
          postImageSelections: new Map(),
        };
      }
      
      const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
      if (remainingPosts.length === 0) {
        // Fallback: create a new empty post if somehow no posts remain
        const newPost = createNewEmptyPost(0);
        return {
          posts: [newPost],
          selectedPostId: newPost.id,
          postImageSelections: new Map(),
        };
      }
      
      const lastPost = remainingPosts[remainingPosts.length - 1]!;
      const newPostImageSelections = new Map(state.postImageSelections);
      newPostImageSelections.set(lastPost.id, lastPost.images[0]?.id ?? null);
      return {
        posts: remainingPosts,
        selectedPostId: lastPost.id,
        postImageSelections: newPostImageSelections,
      };
    }

    case "REORDER_POSTS": {
      const { activeId, overId } = action.payload;
      const updatedPosts = [...state.posts];
      const activeIndex = updatedPosts.findIndex(p => p.id === activeId);
      const overIndex = updatedPosts.findIndex(p => p.id === overId);

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
      const updatedPosts = state.posts.map(post => {
        if (post.id === state.selectedPostId) {
          const images = [...post.images];
          const activeIndex = images.findIndex(img => img.id === activeImageId);
          const overIndex = images.findIndex(img => img.id === overImageId);

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

    default:
      return state;
  }
} 