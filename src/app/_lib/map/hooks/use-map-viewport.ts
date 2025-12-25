import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import type { BBox } from "geojson";

type MapViewportOptions = {
  padding?: number;
};

export function useMapViewport({ padding = 0 }: MapViewportOptions = {}) {
  const map = useMap();
  const [bbox, setBbox] = useState<BBox>([-180, -90, 180, 90]);
  const [zoom, setZoom] = useState(0);

  // observe the map to get current bounds
  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("idle", () => {
      const bounds = map.getBounds?.();
      const currentZoom = map.getZoom?.();
      const projection = map.getProjection?.();

      if (!bounds || typeof currentZoom !== "number" || !projection) return;

      const sw = bounds.getSouthWest?.();
      const ne = bounds.getNorthEast?.();

      if (!sw || !ne) return;

      const paddingDegrees = degreesPerPixel(currentZoom) * padding;

      const n = Math.min(90, ne.lat() + paddingDegrees);
      const s = Math.max(-90, sw.lat() - paddingDegrees);

      const w = sw.lng() - paddingDegrees;
      const e = ne.lng() + paddingDegrees;

      setBbox([w, s, e, n]);
      setZoom(currentZoom);
    });

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  }, [map, padding]);

  return { bbox, zoom };
}

function degreesPerPixel(zoomLevel: number) {
  // 360° divided by the number of pixels at the zoom-level
  return 360 / (Math.pow(2, zoomLevel) * 256);
}

