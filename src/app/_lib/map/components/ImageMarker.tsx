"use client";

import { useCallback, useState } from "react";
import {
  AdvancedMarker,
  useAdvancedMarkerRef,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Feature, Point } from "geojson";
import type { GeoJsonImageFeature } from "~/server/lib/types";

type ImageMarkerProps = {
  position: google.maps.LatLngLiteral;
  featureId: string;
  feature: Feature<Point, GeoJsonImageFeature["properties"]>;
};

export function ImageMarker({
  position,
  featureId,
  feature,
}: ImageMarkerProps) {
  const [markerRef] = useAdvancedMarkerRef();
  const [showInfo, setShowInfo] = useState(false);

  const map = useMap();
  const handleClick = useCallback(() => {
    if (!map) return;

    const pano = map.getStreetView();
    pano.setPosition(position);
    pano.setVisible(true);
  }, [map, position]);

  return (
    <AdvancedMarker ref={markerRef} position={position} onClick={handleClick}>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "3px solid white",
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={feature.properties.url}
          alt={`Image ${featureId}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      {showInfo && (
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 1000,
            maxWidth: "200px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={feature.properties.url}
            alt={`Image ${featureId}`}
            style={{
              width: "100%",
              maxHeight: "150px",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </AdvancedMarker>
  );
}
