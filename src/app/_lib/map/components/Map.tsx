import { type RefObject, useContext, useEffect, useRef, useState } from "react";
import { createContext } from "react";
import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import "maplibre-gl/dist/maplibre-gl.css";

type Context = {
  mapRef: RefObject<maplibregl.Map | null>;
  isMapReady: boolean;
} | null;

const MapContext = createContext<Context>(null);

export default function Map({ children }: { children?: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  return (
    <MapContext.Provider value={{ mapRef, isMapReady }}>
      <div ref={mapContainer} className="h-full w-full" />
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
