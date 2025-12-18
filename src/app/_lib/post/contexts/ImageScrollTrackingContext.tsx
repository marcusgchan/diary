import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";

type ImageScrollTrackingContextData<
  TContainer extends HTMLElement,
  TElement extends HTMLElement,
> = {
  scrollToImage: (element: Element, instant?: boolean) => void;
  isScrollingProgrammatically: boolean;
  containerRef: (node: TContainer | null) => void;
  containerElement: TContainer | null;
  getImageElementsMap: () => Map<string, TElement>;
};

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
  const [containerElement, setContainerElement] = useState<TContainer | null>(
    null,
  );
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] =
    useState(false);
  const imageElementsRef = useRef<Map<string, TElement>>(null);

  const scrollToImage = useCallback(
    (element: Element, instant = false): void => {
      if (instant) {
        element.scrollIntoView({
          behavior: "instant",
          block: "nearest",
          inline: "center",
        });
        return;
      }

      setIsScrollingProgrammatically(true);

      if (!containerElement) return;

      const handleScrollEnd = () => {
        setIsScrollingProgrammatically(false);
        containerElement.removeEventListener("scrollend", handleScrollEnd);
      };
      containerElement.addEventListener("scrollend", handleScrollEnd);

      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    },
    [containerElement],
  );

  const setContainerRef = useCallback((node: TContainer | null) => {
    setContainerElement(node);
  }, []);

  function getImageElementsMap() {
    if (imageElementsRef.current === null) {
      imageElementsRef.current = new Map<string, TElement>();
      return imageElementsRef.current;
    }
    return imageElementsRef.current;
  }

  const ctx: ImageScrollTrackingContextData<TContainer, TElement> = {
    scrollToImage,
    isScrollingProgrammatically,
    containerRef: setContainerRef,
    containerElement,
    getImageElementsMap,
  };

  return (
    <ImageScrollTrackingContext.Provider
      value={
        ctx as unknown as ImageScrollTrackingContextData<
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
