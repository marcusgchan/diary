"use client";

import { createContext, type Dispatch, useContext, useReducer } from "react";
import {
  initialState,
  type PostsAction,
  postsReducer,
  type PostsState,
} from "./postsReducer";

type PostsContextValue = {
  state: PostsState;
  dispatch: Dispatch<PostsAction>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(postsReducer, initialState);

  return <PostsContext value={{ state, dispatch }}>{children}</PostsContext>;
}

export function usePosts() {
  const c = useContext(PostsContext);
  if (c === null) {
    throw new Error("usePosts() must be used inside a PostsProvider");
  }

  return c;
}
