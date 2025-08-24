"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTRPC } from "~/trpc/TrpcProvider";
import { usePosts } from "../contexts/PostsContext";

import { useQuery } from "@tanstack/react-query";

export function PostLoader({ children }: { children: React.JSX.Element }) {
  const api = useTRPC();
  const params = useParams();
  const entryId = Number(params.entryId);
  const { data } = useQuery(
    api.diary.getPostsForForm.queryOptions({ entryId }),
  );
  const { dispatch } = usePosts();

  // Only load data in once
  const hasLoadedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!hasLoadedRef.current && data) {
      dispatch({ type: "LOAD_POSTS", payload: data.posts });
    }
  }, [data, hasLoadedRef, dispatch]);
  return children;
}
