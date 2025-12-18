import { createContext, useContext } from "react";
import { useScrollToImage } from "../hooks/useScrollToImage";
import { useImageElementsMap } from "../hooks/useImageElementsMap";

type ImageScrollTrackingContextData<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
> = ReturnType<typeof useScrollToImage<TContainer>> &
  ReturnType<typeof useImageElementsMap<TElement>>;

const ImageScrollTrackingContext = createContext<ImageScrollTrackingContextData<
  HTMLElement,
  HTMLElement
> | null>(null);

type ImageScrollTrackingContextProviderProps = {
  children: React.ReactNode;
};

export function ImageScrollTrackingContextProvider<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
>({ children }: ImageScrollTrackingContextProviderProps) {
  const scrollToImageData = useScrollToImage<TContainer>();
  const imageElementsMapData = useImageElementsMap<TElement>();
  const scrollTrackingData = {
    ...scrollToImageData,
    ...imageElementsMapData,
  };

  return (
    <ImageScrollTrackingContext.Provider
      value={
        scrollTrackingData as unknown as ImageScrollTrackingContextData<
          HTMLElement,
          HTMLElement
        >
      }
    >
      {children}
    </ImageScrollTrackingContext.Provider>
  );
}

export function useImageScrollTracking<
  TContainer extends HTMLElement = HTMLElement,
  TElement extends HTMLElement = HTMLElement,
>(): ImageScrollTrackingContextData<TContainer, TElement> {
  const ctx = useContext(ImageScrollTrackingContext);

  if (!ctx) {
    throw new Error(
      "useImageScrollTracking() must be used inside ImageScrollTrackingContextProvider",
    );
  }

  return ctx as unknown as ImageScrollTrackingContextData<TContainer, TElement>;
}
