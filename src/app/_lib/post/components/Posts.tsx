"use client";
import { useParams } from "next/navigation";
import { useTRPC } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { PostListsSkeletion } from "./PostsListSkeleton";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ImageClusters } from "../../map/components/ImageClusters";
import { MapSkeleton } from "../../map/components/MapSkeleton";
import { LocationMarker } from "../../map/components/LocationMarker";
import { MapPin } from "lucide-react";
import { type RouterOutputs } from "~/server/trpc";
import { cn } from "../../utils/cx";
import { Curve } from "./Curve";
import { useIntersectionObserver } from "../../utils/useIntersectionObserver";
import {
  ImageScrollTrackingContextProvider,
  useImageScrollTracking,
} from "../contexts/ImageScrollTrackingContext";
import Image from "next/image";
import { customImageLoader, getBlurDataURL } from "../../utils/imageLoader";

const InteractiveMap = dynamic(() => import("../../map/components/Map"), {
  ssr: false,
});

export function Posts() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const { data: posts } = useQuery(
    api.diary.getPosts.queryOptions({ entryId }),
  );
  const { data: images } = useQuery(
    api.diary.getImagesWithLocationByEntryId.queryOptions({ entryId }),
  );

  // Check if we have any location data to show on map
  const hasImageLocations = (images?.features.length ?? 0) > 0;
  const hasPostLocations =
    posts?.some((post) => post.location !== null) ?? false;
  const shouldShowMap = hasImageLocations || hasPostLocations;

  if (!shouldShowMap || (posts && posts.length === 0)) {
    return (
      <div className="h-full overflow-y-auto">
        <PostsSection />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="grid min-h-full flex-1 gap-8 pr-4 [grid-template-areas:'map''posts'] [grid-template-columns:minmax(0,1fr)] [grid-template-rows:minmax(375px,1fr)_1fr] lg:pr-0">
        <section className="flex min-h-0 w-full flex-col pr-0 [grid-area:posts] lg:pr-4">
          <PostsSection />
        </section>
        <section className="flex min-h-0 flex-col [grid-area:map]">
          <MapSection />
        </section>
      </div>
    </div>
  );
}

function MapSection() {
  const params = useParams();
  const entryId = Number(params.entryId);
  const api = useTRPC();
  const { data: images, isPending: imagesLoading } = useQuery(
    api.diary.getImagesWithLocationByEntryId.queryOptions({ entryId }),
  );
  const { data: posts, isPending: postsLoading } = useQuery(
    api.diary.getPosts.queryOptions({ entryId }),
  );

  // Get unique posts with location
  const postsWithLocation = useMemo(() => {
    if (!posts) return [];

    const seen = new Set<string>();
    return posts
      .filter((post) => {
        if (!post.location || seen.has(post.id)) return false;
        seen.add(post.id);
        return true;
      })
      .map((post) => ({
        id: post.id,
        location: post.location!,
      }));
  }, [posts]);

  // Check if there are any images with location
  const hasImageLocations = images && images.features.length > 0;

  const defaultCenter = useMemo(() => {
    // First try image locations
    if (images && images.features.length > 0) {
      const coordinates = images.features.map(
        (feature) => feature.geometry.coordinates,
      );
      const avgLng =
        coordinates.reduce((sum, [lng]) => sum + lng, 0) / coordinates.length;
      const avgLat =
        coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length;
      return { lat: avgLat, lng: avgLng };
    }

    // Fall back to post locations
    if (postsWithLocation.length > 0) {
      const avgLng =
        postsWithLocation.reduce((sum, p) => sum + p.location.longitude, 0) /
        postsWithLocation.length;
      const avgLat =
        postsWithLocation.reduce((sum, p) => sum + p.location.latitude, 0) /
        postsWithLocation.length;
      return { lat: avgLat, lng: avgLng };
    }

    return { lat: 0, lng: 0 };
  }, [images, postsWithLocation]);

  if (imagesLoading || postsLoading) {
    return (
      <div className="mx-auto h-full w-full max-w-sm lg:max-w-none">
        <MapSkeleton />
      </div>
    );
  }

  // Don't show map if no images with location and no post locations
  if (!hasImageLocations && postsWithLocation.length === 0) {
    return null;
  }

  // Get unique location address to display above map
  const locationAddress = postsWithLocation[0]?.location.address;

  return (
    <div className="mx-auto flex h-full w-full flex-col lg:max-w-none">
      {locationAddress && (
        <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} />
          {locationAddress}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <InteractiveMap defaultCenter={defaultCenter}>
          {images && <ImageClusters geoJson={images} />}
          {/* Show post location markers only if no images exist */}
          {!hasImageLocations &&
            postsWithLocation.map((post) => (
              <LocationMarker
                key={post.id}
                position={{
                  lat: post.location.latitude,
                  lng: post.location.longitude,
                }}
              />
            ))}
        </InteractiveMap>
      </div>
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

  if (isPending) {
    return <PostListsSkeletion />;
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-lg text-muted-foreground">Something went wrong</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
        <p className="text-lg text-muted-foreground">No posts</p>
        <Link href={`/diaries/${diaryId}/entries/${entryId}/posts/edit`}>
          <Button type="button">Create Post</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full">
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
  return (
    <ImageScrollTrackingContextProvider<HTMLUListElement, HTMLLIElement>>
      <PostImageContent post={post} />
    </ImageScrollTrackingContextProvider>
  );
}

function PostImageContent({ post }: { post: Post }) {
  const {
    scrollToImage,
    containerRef,
    getImageElementsMap: getImgsMap,
    setImageElementRef,
  } = useImageScrollTracking();

  const [selectedImageId, setSelectedImageId] = useState(post.images[0]!.id);
  const onIntersect = useCallback(
    (_: Element, intersectionId: string) => {
      setSelectedImageId(intersectionId);
    },
    [setSelectedImageId],
  );

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
              ref={setImageElementRef(image.id)}
              className="relative flex-shrink-0 basis-full snap-center"
            >
              <ScrollableImageContainer<HTMLImageElement>
                id={image.id}
                onIntersect={onIntersect}
              >
                {({ ref }) => {
                  return (
                    <Image
                      ref={ref}
                      src={image.key}
                      alt={image.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loader={customImageLoader}
                      placeholder="blur"
                      blurDataURL={getBlurDataURL(image.key)}
                    />
                  );
                }}
              </ScrollableImageContainer>
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
                  "relative aspect-square h-10 w-10 overflow-hidden rounded border-2 border-gray-300",
                  selectedImageId === image.id &&
                    "border-2 border-blue-400 ring-1 ring-blue-300",
                )}
                onClick={() => {
                  scrollToImage(getImgsMap().get(image.id)!);
                  setSelectedImageId(image.id);
                }}
              >
                <Image
                  src={image.key}
                  alt=""
                  fill
                  className="object-cover"
                  loader={customImageLoader}
                  sizes="40px"
                  placeholder="blur"
                  blurDataURL={getBlurDataURL(image.key)}
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

type ImageContainerProps<U extends Element> = {
  id: string;
  children: ({ ref }: { ref: (node: U | null) => void }) => ReactNode;
  onIntersect: (element: Element, intersectionId: string) => void;
};
function ScrollableImageContainer<U extends Element>({
  id,
  children,
  onIntersect,
}: ImageContainerProps<U>) {
  const { isScrollingProgrammatically, containerElement } =
    useImageScrollTracking();

  const { ref } = useIntersectionObserver<HTMLElement, U>({
    onIntersect: useCallback(
      (element: Element) => {
        onIntersect(element, id);
      },
      [onIntersect, id],
    ),
    rootElement: containerElement,
    disabled: isScrollingProgrammatically,
    threshold: 0.5,
  });
  return children({ ref });
}
