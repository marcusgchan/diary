import { createContext, useContext } from "react";
import { useImageScrollTracking as useImageScrollTrackingHook } from "../hooks/useImageScrollTracking";

type PostListScrollTrackingContextData<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
> = {
  scrollToImage: (element: Element, instant?: boolean) => void;
  isScrollingProgrammatically: boolean;
  containerRef: (node: TContainer | null) => void;
  containerElement: TContainer | null;
  getImageElementsMap: () => Map<string, TElement>;
};

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
  const scrollTrackingData = useImageScrollTrackingHook<TContainer, TElement>();

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
