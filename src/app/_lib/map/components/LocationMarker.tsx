"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

type LocationMarkerProps = {
  position: google.maps.LatLngLiteral;
};

export function LocationMarker({ position }: LocationMarkerProps) {
  return (
    <AdvancedMarker position={position}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#ef4444",
          border: "3px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <MapPin size={20} color="white" fill="white" />
      </div>
    </AdvancedMarker>
  );
}
