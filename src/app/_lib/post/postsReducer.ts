export type Post = {
  id: string;
  title: string;
  description: string;
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
  | { type: "SELECT_IMAGE"; payload: string };

const emptyPost: Omit<Post, "id"> = {
  images: [],
  title: "",
  description: "",
};

const createNewEmptyPost = () => ({
  ...emptyPost,
  id: crypto.randomUUID(),
});

const firstPost = createNewEmptyPost();

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

      const newPostToSelect = createNewEmptyPost();

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

      const newPost = createNewEmptyPost();
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
      const newPost = createNewEmptyPost();
      return {
        ...state,
        posts: [...state.posts, newPost],
        selectedPostId: newPost.id,
        selectedImageId: null,
      };
    }

    default:
      return state;
  }
} 