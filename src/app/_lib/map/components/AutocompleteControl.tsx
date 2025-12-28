"use client";

import { ControlPosition, MapControl } from "@vis.gl/react-google-maps";

export function AutocompleteControl({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MapControl position={ControlPosition.TOP_CENTER}>{children}</MapControl>
  );
}
