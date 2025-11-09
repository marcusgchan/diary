"use client";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePosts } from "../contexts/PostsContext";
import { createPostSchema } from "~/server/lib/schema";
import { useToast } from "../../ui/use-toast";
import { PostListsSkeletion } from "./PostsListSkeleton";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ImageClusters } from "../../map/components/ImageClusters";
import { type RouterOutputs } from "~/server/trpc";
import { cn } from "../../utils/cx";
import { Plus } from "lucide-react";

const InteractiveMap = dynamic(() => import("../../map/components/Map"), {
  ssr: false,
});

export function Posts() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const { data } = useQuery(api.diary.getPosts.queryOptions({ entryId }));

  return (
    <div className="mt-4 grid h-full min-h-0 gap-8 overflow-y-auto [grid-template-areas:'posts''map'] [grid-template-rows:auto_350px] lg:overflow-visible lg:[grid-template-areas:'posts_map'] lg:[grid-template-columns:minmax(300px,350px)_minmax(350px,1fr)] lg:[grid-template-rows:none]">
      <section className="mx-auto h-full w-full max-w-sm overflow-visible [grid-area:posts] lg:overflow-y-auto">
        <PostsSection />
      </section>
      <section className="h-full [grid-area:map]">
        {data && data.length > 0 && <MapSection />}
      </section>
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
    <div className="mx-auto h-full w-full max-w-sm lg:max-w-none">
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
  const diaryId = Number(params.diaryId);

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
    }),
  );
  const { toast } = useToast();
  const router = useRouter();
  function handleCreate() {
    const parseResult = createPostSchema.safeParse({
      entryId: entryId,
      posts: state.posts,
    });
    if (!parseResult.success) {
      toast({ title: "Unable to create toast" });
      return;
    }
    mutation.mutate(parseResult.data);
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

  function handleEditPosts() {
    router.push(`/diaries/${diaryId}/entries/${entryId}/posts/edit`);
  }

  return (
    <div className="h-full space-y-2">
      {/* <Button */}
      {/*   className="ml-auto block" */}
      {/*   type="button" */}
      {/*   onClick={() => handleEditPosts()} */}
      {/* > */}
      {/*   Edit Posts */}
      {/* </Button> */}
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
    <ul className="space-y-2">
      {posts.map((post) => {
        return <Post key={post.id} post={post} />;
      })}
    </ul>
  );
}

function useScrollToImage<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);

  function scrollToImage(element: Element, instant = false) {
    if (instant) {
      element.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      });
      return;
    }

    setIsScrollingProgrammatically(true);

    const container = containerRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      setIsScrollingProgrammatically(false);
      container.removeEventListener("scrollend", handleScrollEnd);
    };
    container.addEventListener("scrollend", handleScrollEnd);

    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return { scrollToImage, isScrollingProgrammatically, containerRef };
}

export type IntersectionObserverReturn<T extends Element> = {
  ref: RefObject<T | null>;
};
export type IntersectionObserverResult<T extends Element> = {
  onIntersect: (element: Element, intersectId: string) => void;
  rootElement: T;
  intersectId: string;
  disabled?: boolean;
};
export function useIntersectionObserver<T extends Element, U extends Element>({
  onIntersect,
  intersectId,
  disabled,
  rootElement,
}: IntersectionObserverResult<T>): IntersectionObserverReturn<U> {
  const ref = useRef<U>(null);
  const observerRef = useRef<IntersectionObserver>(null);

  useEffect(() => {
    if (disabled) return;
    if (ref.current === null) {
      throw new Error("ref not set");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const centerEntry = entries.find(
          (entry) => entry.intersectionRatio > 0.8,
        );
        if (centerEntry) {
          const element = centerEntry.target;
          if (element) {
            onIntersect(element, intersectId);
          }
        }
      },
      {
        root: rootElement,
        threshold: 0.8,
      },
    );

    observerRef.current = observer;
    observerRef.current.observe(ref.current);

    return () => observerRef.current!.disconnect();
  }, [ref, onIntersect, disabled, rootElement, intersectId]);

  return { ref: ref };
}

function Post({ post }: { post: Post }) {
  const { scrollToImage, isScrollingProgrammatically, containerRef } =
    useScrollToImage<HTMLUListElement>();

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

  return (
    <li key={post.id} className="w-full space-y-2">
      {post.title.length > 0 && (
        <h3 className="text-xl font-bold">{post.title}</h3>
      )}
      <ul
        ref={containerRef}
        className="hide-scrollbar flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {post.images.map((image) => (
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
            <ScrollableImageContainer<HTMLUListElement, HTMLImageElement>
              id={image.id}
              onIntersect={onIntersect}
              isScrollingProgrammatically={isScrollingProgrammatically}
              rootElement={containerRef.current!}
            >
              {({ ref }) => {
                return (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    ref={ref}
                    className="aspect-square h-auto object-cover"
                    alt={image.name}
                    src={`/api/image/${image.key}`}
                  />
                );
              }}
            </ScrollableImageContainer>
          </li>
        ))}
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
      {post.description.length > 0 && <p>{post.description}</p>}
    </li>
  );
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
