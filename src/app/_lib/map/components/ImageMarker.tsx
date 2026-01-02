"use client";

import { useCallback, useState } from "react";
import {
  AdvancedMarker,
  useAdvancedMarkerRef,
  useMap,
} from "@vis.gl/react-google-maps";
import Image from "next/image";
import type { Feature, Point } from "geojson";
import type { GeoJsonImageFeature } from "~/server/lib/types";
import { customImageLoader } from "~/app/_lib/utils/imageLoader";

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
          position: "relative",
        }}
      >
        <Image
          src={feature.properties.key}
          alt={`Image ${featureId}`}
          fill
          className="object-cover"
          sizes="40px"
          loader={customImageLoader}
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
          <div style={{ position: "relative", width: "100%", height: "150px" }}>
            <Image
              src={feature.properties.key}
              alt={`Image ${featureId}`}
              fill
              className="object-contain"
              sizes="200px"
              loader={customImageLoader}
            />
          </div>
        </div>
      )}
    </AdvancedMarker>
  );
}
