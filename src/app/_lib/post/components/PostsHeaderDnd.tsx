"use client";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ImageIcon } from "lucide-react";
import { Badge } from "../../ui/badge";
import type { PostForm as Post } from "~/server/lib/types";
import { usePostActions } from "../hooks/usePostActions";
import { usePostsSensors } from "../hooks/usePostsSensors";
import { useDndState } from "../hooks/useDndState";
import { usePosts } from "../contexts/PostsContext";
import { PostListScrollTrackingContextProvider } from "../contexts/PostListScrollTrackingContext";
import { PostsSelectionCarousel } from "./PostsListHeader";
import type { PostFormImage } from "~/server/lib/types";
import { Skeleton } from "../../ui/skeleton";
import Image from "next/image";
import { customImageLoader } from "../../utils/imageLoader";

// Simple image renderer for drag overlay
function ImageRenderer({ image }: { image: PostFormImage }) {
  if (image.type === "loaded") {
    return (
      <Image
        src={image.key}
        alt={image.name}
        fill
        className="pointer-events-none object-cover"
        sizes="40px"
        loader={customImageLoader}
      />
    );
  }

  return <Skeleton className="h-full w-full" />;
}

function DragOverlayItem({ post }: { post: Post }) {
  return (
    <div className="rotate-3 transform rounded p-2 opacity-90 shadow-lg">
      {post.images.length > 0 && (
        <div className="relative h-10 w-10">
          <Badge className="absolute right-0 top-0 block h-5 min-w-5 -translate-y-1/2 translate-x-1/2 rounded-full p-0 text-center font-mono tabular-nums">
            {post.images.length}
          </Badge>
          <ImageRenderer image={post.images[0]!} />
        </div>
      )}
      {post.images.length === 0 && (
        <ImageIcon className="h-10 w-10 text-foreground" />
      )}
    </div>
  );
}

export function PostsHeaderDnd() {
  const { state } = usePosts();
  const { swapPostByIdAction } = usePostActions();
  const sensors = usePostsSensors();
  const { activeId, onDragStart, onDragEnd } = useDndState({
    onDragEnd: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
      swapPostByIdAction(activeId as string, overId as string);
    },
  });

  const activePost = activeId
    ? (state.posts.find((p) => p.id === activeId) ?? null)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      autoScroll={{
        acceleration: 5,
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={state.posts.map((post) => ({ id: post.id }))}
        strategy={horizontalListSortingStrategy}
      >
        <PostListScrollTrackingContextProvider>
          <PostsSelectionCarousel />
        </PostListScrollTrackingContextProvider>
      </SortableContext>
      <DragOverlay>
        {activePost ? <DragOverlayItem post={activePost} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
