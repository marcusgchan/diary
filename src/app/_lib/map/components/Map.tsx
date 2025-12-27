import { type ReactNode } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { env } from "~/env.mjs";

type InteractiveMapProps = {
  children?: ReactNode;
  defaultCenter: { lat: number; lng: number };
  defaultZoom?: number;
  onZoomChanged?: (zoom: number) => void;
};

export default function InteractiveMap({
  children,
  defaultCenter,
  defaultZoom = 10,
  onZoomChanged,
}: InteractiveMapProps) {
  return (
    <Map
      defaultZoom={defaultZoom}
      defaultCenter={defaultCenter}
      mapId={env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      gestureHandling="cooperative"
      style={{ width: "100%", height: "100%" }}
      onZoomChanged={(zoom) => {
        if (typeof zoom === "number" && onZoomChanged) {
          onZoomChanged(zoom);
        }
      }}
    >
      {children}
    </Map>
  );
}
