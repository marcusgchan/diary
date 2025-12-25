"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";
import { env } from "~/env.mjs";

export function MapProvider({ children }: { children: ReactNode }) {
  return (
    <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      {children}
    </APIProvider>
  );
}
