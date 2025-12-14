import { type RefObject, useContext, useEffect, useRef, useState } from "react";
import { createContext } from "react";
import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import "maplibre-gl/dist/maplibre-gl.css";
import { ScrollHint } from "./ScrollHint";

type Context = {
  mapRef: RefObject<maplibregl.Map | null>;
  isMapReady: boolean;
} | null;

const MapContext = createContext<Context>(null);

export default function Map({ children }: { children?: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [scrollHintMessage, setScrollHintMessage] = useState("");
  const touchStartTime = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastHintTime = useRef<number>(0);

  useEffect(() => {
    function initMap() {
      if (!mapContainer.current) {
        throw new Error("Map container doesn't exist!");
      }

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            protomaps: {
              type: "vector",
              url: "pmtiles://http://localhost:8000/world1.pmtiles",
            },
          },
          sprite:
            "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
          glyphs:
            "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
          layers: layers("protomaps", namedFlavor("light"), { lang: "en" }),
        },
      });
      return map;
    }

    const map = initMap();
    mapRef.current = map;

    const handleStyleLoad = () => {
      setIsMapReady(true);
    };

    map.on("load", handleStyleLoad);

    // Enable two-finger touch zoom and rotate
    map.touchZoomRotate.enable();

    // Handle wheel events for desktop
    const handleWheel = (e: maplibregl.MapWheelEvent) => {
      if (!e.originalEvent.ctrlKey) {
        e.preventDefault(); // Prevent zoom, allow page scroll
        // Throttle message display to avoid spam
        const now = Date.now();
        if (now - lastHintTime.current > 2000) {
          setScrollHintMessage("Hold Ctrl and scroll to zoom");
          setShowScrollHint(true);
          lastHintTime.current = now;
        }
      }
    };

    map.on("wheel", handleWheel);

    const handleTouchMove = (e: maplibregl.MapTouchEvent) => {
      if (e.originalEvent.touches.length === 1) {
        const touch = e.originalEvent.touches[0];
        if (!touch) return;

        // Throttle message display
        const now = Date.now();
        if (now - lastHintTime.current > 2000) {
          setScrollHintMessage("Use 2 fingers to scroll");
          setShowScrollHint(true);
          lastHintTime.current = now;
        }
      }
    };

    map.on("touchmove", handleTouchMove);

    map.addControl(
      new maplibregl.NavigationControl({
        showZoom: true,
        visualizeRoll: false,
      }),
    );

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  return (
    <MapContext.Provider value={{ mapRef, isMapReady }}>
      <div ref={mapContainer} className="relative h-full w-full">
        <ScrollHint
          message={scrollHintMessage}
          visible={showScrollHint}
          onDismiss={() => setShowScrollHint(false)}
        />
      </div>
      {isMapReady && children}
    </MapContext.Provider>
  );
}

export function useMapApi() {
  const api = useContext(MapContext);
  if (api === null) {
    throw new Error("useMapApi must be used in Map");
  }
  return api;
}
