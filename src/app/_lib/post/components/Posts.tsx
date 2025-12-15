"use client";
import { useParams } from "next/navigation";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePosts } from "../contexts/PostsContext";
import { createPostSchema } from "~/server/lib/schema";
import { PostListsSkeletion } from "./PostsListSkeleton";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ImageClusters } from "../../map/components/ImageClusters";
import { MapSkeleton } from "../../map/components/MapSkeleton";
import { type RouterOutputs } from "~/server/trpc";
import { cn } from "../../utils/cx";
import { Curve } from "./Curve";
import { useScrollToImage } from "../hooks/useScrollToImage";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import { toast } from "sonner";

const InteractiveMap = dynamic(() => import("../../map/components/Map"), {
  ssr: false,
});

export function Posts() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const { data, isPending } = useQuery(
    api.diary.getPosts.queryOptions({ entryId }),
  );
  const { isPending: imagesPending } = useQuery(
    api.diary.getImagesByEntryId.queryOptions({ entryId }),
  );

  const isLoading = isPending || imagesPending;

  return (
    <div className="overflow-y-auto">
      <div className="grid h-full min-h-0 gap-8 pr-4 [grid-template-areas:'map''posts'] [grid-template-columns:minmax(0,1fr)] [grid-template-rows:1fr_1fr] lg:pr-0">
        <section className="h-full min-h-0 w-full pr-0 [grid-area:posts] lg:pr-4">
          <PostsSection />
        </section>
        <section className="h-full [grid-area:map]">
          {isLoading ? (
            <div className="mx-auto h-full w-full max-w-sm lg:max-w-none">
              <MapSkeleton />
            </div>
          ) : (
            data && data.length > 0 && <MapSection />
          )}
        </section>
      </div>
    </div>
  );
}

function MapSection() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const { data: images } = useQuery(
    api.diary.getImagesByEntryId.queryOptions({ entryId }),
  );

  return (
    <div className="mx-auto h-full w-full lg:max-w-none">
      <InteractiveMap>
        {images && <ImageClusters geoJson={images} />}
      </InteractiveMap>
    </div>
  );
}

function PostsSection() {
  const api = useTRPC();
  const params = useParams();
  const entryId = Number(params.entryId);

  const {
    data: posts,
    isError,
    isPending,
  } = useQuery(api.diary.getPosts.queryOptions({ entryId }));

  const { state } = usePosts();
  const disableCreate = useMemo(() => {
    if (!state.posts) {
      return true;
    }

    const hasAtLeastOnePostWithNonLoadedImage = state.posts.some((post) => {
      return (
        post.images.length === 0 ||
        post.images.some((image) => image.type !== "loaded")
      );
    });
    return hasAtLeastOnePostWithNonLoadedImage;
  }, [state.posts]);

  const queryClient = useQueryClient();
  const mutation = useMutation(
    api.diary.createPosts.mutationOptions({
      async onSuccess() {
        return Promise.all([
          queryClient.invalidateQueries(
            api.diary.getPosts.queryFilter({ entryId }),
          ),
          queryClient.invalidateQueries(
            api.diary.getImagesByEntryId.queryFilter({ entryId }),
          ),
        ]);
      },
      onError() {
        toast.error("There was an error while creating your posts");
      },
    }),
  );
  function handleCreate() {
    const moreThanOneImage = state.posts.every(
      (post) => post.images.length > 0,
    );

    if (!moreThanOneImage) {
      toast.error("There is a post with an empty image");
      return;
    }

    mutation.mutate({ entryId: entryId, posts: state.posts });
  }

  if (isPending) {
    return <PostListsSkeletion />;
  }

  if (isError) {
    return "Something went wrong";
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-2">
        <EditPosts />
        <Button
          onClick={() => handleCreate()}
          disabled={disableCreate}
          type="button"
        >
          Create Post
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full space-y-2">
      <PostList posts={posts} />
    </div>
  );
}
type Post = RouterOutputs["diary"]["getPosts"][number];
type PostsProps = {
  posts: Post[];
};

function PostList({ posts }: PostsProps) {
  return (
    <>
      {/* Mobile: Vertical list layout */}
      <ul className="space-y-2 lg:hidden">
        {posts.map((post) => {
          return (
            <li key={post.id} className="space-y-2">
              {post.title && <PostTitle>{post.title}</PostTitle>}
              <PostImage post={post} />
              {post.description && (
                <PostDescription>{post.description}</PostDescription>
              )}
            </li>
          );
        })}
      </ul>
      {/* Desktop: Animated grid layout */}
      <div className="hidden h-full grid-cols-[minmax(0,1fr)_100px_1fr] lg:grid">
        {posts.flatMap((post, i) => {
          return [
            <div
              className={cn(
                "[grid-row-end:span_2]",
                i % 2 === 0 && "col-start-1 col-end-2",
                i % 2 === 1 && "col-start-3 col-end-4",
              )}
              style={{ gridRowStart: 1 + i * 2 }}
              key={post.id}
            >
              {post.title && <PostTitle>{post.title}</PostTitle>}
              <PostImage post={post} />
            </div>,
            post.description.length > 0 && (
              <div
                key={`description-${post.id}`}
                className={cn(
                  "h-full min-h-0 content-center overflow-y-auto p-14 [grid-row-end:span_2]",
                  i % 2 === 0 && "col-start-3 col-end-4",
                  i % 2 === 1 && "col-start-1 col-end-2",
                )}
                style={{ gridRowStart: 1 + i * 2 }}
              >
                <PostDescription>{post.description}</PostDescription>
              </div>
            ),
          ];
        })}
        {posts.length > 1 &&
          Array.from({ length: posts.length - 1 }).map((_, i) => {
            const rotationStyle =
              i % 2 === 1 ? { transform: "rotateY(180deg)" } : {};
            return (
              <div
                key={`curve-container-${i}`}
                style={{ gridRowStart: 2 + i * 2, ...rotationStyle }}
                className="relative col-start-2 col-end-3 [grid-row-end:span_2]"
              >
                <div className="absolute inset-0">
                  <Curve
                    style={{
                      strokeDasharray: 10,
                      strokeDashoffset: 0,
                    }}
                  />
                </div>
                <div className="absolute inset-0">
                  <Curve
                    style={{
                      animationName: "path",
                      strokeDasharray: 200,
                      strokeDashoffset: 200,
                      strokeWidth: "2px",
                      animationDelay: `${0.5 + i}s`,
                      animationFillMode: "forwards",
                      animationDuration: "1s",
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}

function PostTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 h-7 max-w-full truncate text-xl font-bold">
      {children}
    </h3>
  );
}

function PostImage({ post }: { post: Post }) {
  const {
    scrollToImage,
    isScrollingProgrammatically,
    containerRef,
  }: {
    scrollToImage: (element: Element, instant?: boolean) => void;
    isScrollingProgrammatically: boolean;
    containerRef: RefObject<HTMLUListElement | null>;
  } = useScrollToImage<HTMLUListElement>();

  const imgsRef = useRef<Map<string, HTMLLIElement>>(null);

  function getImgsMap() {
    if (imgsRef.current === null) {
      imgsRef.current = new Map<string, HTMLLIElement>();
      return imgsRef.current;
    }

    return imgsRef.current;
  }

  const [selectedImageId, setSelectedImageId] = useState(post.images[0]!.id);
  const onIntersect = useCallback(
    (_: Element, intersectionId: string) => {
      setSelectedImageId(intersectionId);
    },
    [setSelectedImageId],
  );
  const rootElement = containerRef.current;

  return (
    <div className="space-y-2">
      <ul
        ref={containerRef}
        className="hide-scrollbar flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {post.images.map((image) => {
          return (
            <li
              key={image.id}
              ref={(node) => {
                const map = getImgsMap();
                if (node) {
                  map.set(image.id, node);
                } else {
                  map.delete(image.id);
                }
              }}
              className="flex-shrink-0 basis-full snap-center"
            >
              {rootElement ? (
                <ScrollableImageContainer<HTMLUListElement, HTMLImageElement>
                  id={image.id}
                  onIntersect={onIntersect}
                  isScrollingProgrammatically={isScrollingProgrammatically}
                  rootElement={rootElement}
                >
                  {({ ref }) => {
                    return (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        ref={ref}
                        // className="aspect-square h-auto object-cover"
                        className="aspect-square w-full object-cover"
                        alt={image.name}
                        src={`/api/image/${image.key}`}
                      />
                    );
                  }}
                </ScrollableImageContainer>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className="aspect-square w-full object-cover"
                  alt={image.name}
                  src={`/api/image/${image.key}`}
                />
              )}
            </li>
          );
        })}
      </ul>
      <ul className="flex justify-center gap-1">
        {post.images.map((image) => {
          return (
            <li key={image.id}>
              <button
                className={cn(
                  "rounded border-2 border-gray-300",
                  selectedImageId === image.id &&
                    "border-2 border-blue-400 ring-1 ring-blue-300",
                )}
                onClick={() => {
                  scrollToImage(getImgsMap().get(image.id)!);
                  setSelectedImageId(image.id);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="aspect-square w-[40px] object-cover"
                  alt=""
                  src={`/api/image/${image.key}`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PostDescription({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-wrap">{children}</p>;
}

type ImageContainerProps<T extends Element, U extends Element> = {
  id: string;
  children: ({ ref }: { ref: RefObject<U | null> }) => ReactNode;
  isScrollingProgrammatically: boolean;
  onIntersect: (element: Element, intersectionId: string) => void;
  rootElement: T;
};
function ScrollableImageContainer<T extends Element, U extends Element>({
  id,
  children,
  onIntersect,
  isScrollingProgrammatically,
  rootElement,
}: ImageContainerProps<T, U>) {
  const { ref } = useIntersectionObserver<T, U>({
    onIntersect,
    rootElement,
    intersectId: id,
    disabled: isScrollingProgrammatically,
  });
  return children({ ref });
}
