import { type ReactNode, useEffect, useMemo } from "react";
import { useMapApi } from "./Map";
import maplibregl from "maplibre-gl";
import { createPortal } from "react-dom";

type MarkerProps = {
  children: ReactNode;
  latitude: number;
  longitude: number;
};
export function Marker(props: MarkerProps) {
  const map = useMapApi();

  const marker = useMemo(() => {
    const div = document.createElement("div");
    return new maplibregl.Marker({ element: div });
  }, []);

  useEffect(() => {
    if (map.current === null) {
      return;
    }

    marker.setLngLat([props.longitude, props.latitude]).addTo(map.current);
    return () => {
      marker.remove();
    };
  }, [marker, props.latitude, props.longitude, map]);

  return createPortal(props.children, marker.getElement());
}
