"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "~/trpc/TrpcProvider";
import { usePosts } from "../contexts/PostsContext";

export function PostLoader({ children }: { children: React.JSX.Element }) {
  const params = useParams();
  const entryId = Number(params.entryId);
  const { data } = api.diary.getPostsForForm.useQuery({ entryId });
  const { dispatch } = usePosts();

  // Only load data in once
  const hasLoadedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!hasLoadedRef.current && data) {
      dispatch({ type: "LOAD_POSTS", payload: data });
    }
  }, [data, hasLoadedRef, dispatch]);
  return children;
}
