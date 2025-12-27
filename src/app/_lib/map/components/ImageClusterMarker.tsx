"use client";

import { useCallback } from "react";
import {
  AdvancedMarker,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";

type ImageClusterMarkerProps = {
  clusterId: number;
  onMarkerClick?: (
    marker: google.maps.marker.AdvancedMarkerElement,
    clusterId: number,
  ) => void;
  position: google.maps.LatLngLiteral;
  size: number;
  sizeAsText: string;
};

export function ImageClusterMarker({
  position,
  size,
  sizeAsText,
  onMarkerClick,
  clusterId,
}: ImageClusterMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const handleClick = useCallback(() => {
    if (onMarkerClick && marker) {
      onMarkerClick(marker, clusterId);
    }
  }, [onMarkerClick, marker, clusterId]);

  const markerSize = Math.floor(48 + Math.sqrt(size) * 2);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={position}
      zIndex={size}
      onClick={handleClick}
      style={{ width: markerSize, height: markerSize }}
    >
      <div
        style={{
          width: `${markerSize}px`,
          height: `${markerSize}px`,
          borderRadius: "50%",
          backgroundColor: "#4285f4",
          border: "3px solid white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {sizeAsText}
      </div>
    </AdvancedMarker>
  );
}
