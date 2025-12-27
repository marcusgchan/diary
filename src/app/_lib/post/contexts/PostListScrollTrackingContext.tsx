import { createContext, useContext } from "react";
import { useScrollToImage } from "../hooks/useScrollToImage";
import { useImageElementsMap } from "../hooks/useImageElementsMap";

type PostListScrollTrackingContextData<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
> = ReturnType<typeof useScrollToImage<TContainer>> &
  ReturnType<typeof useImageElementsMap<TElement>>;

const PostListScrollTrackingContext =
  createContext<PostListScrollTrackingContextData<
    HTMLElement,
    HTMLElement
  > | null>(null);

type PostListScrollTrackingContextProviderProps = {
  children: React.ReactNode;
};

export function PostListScrollTrackingContextProvider<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
>({ children }: PostListScrollTrackingContextProviderProps) {
  const scrollToImageData = useScrollToImage<TContainer>();
  const imageElementsMapData = useImageElementsMap<TElement>();
  const scrollTrackingData = {
    ...scrollToImageData,
    ...imageElementsMapData,
  };

  return (
    <PostListScrollTrackingContext.Provider
      value={
        scrollTrackingData as unknown as PostListScrollTrackingContextData<
          HTMLElement,
          HTMLElement
        >
      }
    >
      {children}
    </PostListScrollTrackingContext.Provider>
  );
}

export function usePostListScrollTracking<
  TContainer extends HTMLElement = HTMLElement,
  TElement extends HTMLElement = HTMLElement,
>(): PostListScrollTrackingContextData<TContainer, TElement> {
  const ctx = useContext(PostListScrollTrackingContext);

  if (!ctx) {
    throw new Error(
      "usePostListScrollTracking() must be used inside PostListScrollTrackingContextProvider",
    );
  }

  return ctx as unknown as PostListScrollTrackingContextData<
    TContainer,
    TElement
  >;
}
