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
  }[];
};

type PostsState = {
  posts: Post[];
  selectedPostId: string;
  selectedImageId: string | null;
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
  | { type: "REORDER_POSTS"; payload: { activeId: string; overId: string } };

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
  selectedImageId: null,
};

export function postsReducer(state: PostsState, action: PostsAction): PostsState {
  const currentSelectedPost = state.posts.find(p => p.id === state.selectedPostId)!;

  switch (action.type) {
    case "START_NEW_POST": {
      let updatedPosts = state.posts;
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        updatedPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
      }

      const maxOrder = Math.max(...updatedPosts.map(p => p.order), -1);
      const newPostToSelect = createNewEmptyPost(maxOrder + 1);

      if (currentSelectedPost.images.length === 0 && state.posts.length === 1) {
        // Only one post, and it's empty. Replace it.
        return {
          posts: [newPostToSelect],
          selectedPostId: newPostToSelect.id,
          selectedImageId: null,
        };
      } else {
        return {
          posts: [...updatedPosts, newPostToSelect],
          selectedPostId: newPostToSelect.id,
          selectedImageId: null,
        };
      }
    }

    case "START_EDITING": {
      const postIdToEdit = action.payload;
      
      if (currentSelectedPost.id === postIdToEdit) {
        const postToReSelect = state.posts.find(p => p.id === postIdToEdit);
        return {
          ...state,
          selectedImageId: postToReSelect?.images[0]?.id ?? null,
        };
      }

      let updatedPosts = state.posts;
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        updatedPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
      }

      const newPostToFocus = updatedPosts.find(p => p.id === postIdToEdit);

      return {
        posts: updatedPosts,
        selectedPostId: postIdToEdit,
        selectedImageId: newPostToFocus?.images[0]?.id ?? null,
      };
    }

    case "SAVE_POST": {
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
        const lastPost = remainingPosts[remainingPosts.length - 1]!;
        return {
          posts: remainingPosts,
          selectedPostId: lastPost.id,
          selectedImageId: lastPost.images[0]?.id ?? null, 
        };
      }

      const maxOrder = Math.max(...state.posts.map(p => p.order), -1);
      const newPost = createNewEmptyPost(maxOrder + 1);
      return {
        ...state, 
        posts: [...state.posts, newPost],
        selectedPostId: newPost.id,
        selectedImageId: null,
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
      let newSelectedImageId = state.selectedImageId;
      if (action.payload.length > 0 && !state.selectedImageId && currentSelectedPost.images.length === 0) {
        newSelectedImageId = action.payload[0]?.id ?? null;
      }
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === state.selectedPostId
            ? { ...post, images: [...post.images, ...action.payload] }
            : post
        ),
        selectedImageId: newSelectedImageId,
      };
    }

    case "SELECT_IMAGE":
      return {
        ...state,
        selectedImageId: action.payload,
      };

    case "CANCEL_EDITING": {
      if (currentSelectedPost.images.length === 0 && state.posts.length > 1) {
        const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
        const lastPost = remainingPosts[remainingPosts.length - 1]!;
        return {
          posts: remainingPosts,
          selectedPostId: lastPost.id,
          selectedImageId: lastPost.images[0]?.id ?? null,
        };
      }
      const maxOrder = Math.max(...state.posts.map(p => p.order), -1);
      const newPost = createNewEmptyPost(maxOrder + 1);
      return {
        ...state,
        posts: [...state.posts, newPost],
        selectedPostId: newPost.id,
        selectedImageId: null,
      };
    }

    case "DELETE_POST": {
      if (state.posts.length === 1) {
        // If only one post, replace it with a new empty post
        const newPost = createNewEmptyPost(0);
        return {
          posts: [newPost],
          selectedPostId: newPost.id,
          selectedImageId: null,
        };
      }
      
      const remainingPosts = state.posts.filter(p => p.id !== currentSelectedPost.id);
      if (remainingPosts.length === 0) {
        // Fallback: create a new empty post if somehow no posts remain
        const newPost = createNewEmptyPost(0);
        return {
          posts: [newPost],
          selectedPostId: newPost.id,
          selectedImageId: null,
        };
      }
      
      const lastPost = remainingPosts[remainingPosts.length - 1]!;
      return {
        posts: remainingPosts,
        selectedPostId: lastPost.id,
        selectedImageId: lastPost.images[0]?.id ?? null,
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

    default:
      return state;
  }
} 