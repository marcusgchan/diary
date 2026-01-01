"use client";

import { useCallback } from "react";
import type Supercluster from "supercluster";
import type { ClusterProperties } from "supercluster";
import { useSupercluster } from "../hooks/use-supercluster";
import type { GeoJsonImageFeature } from "~/server/lib/types";
import type { GeoJson } from "~/server/lib/types";
import type { Feature, Point } from "geojson";
import { ImageMarker } from "./ImageMarker";
import { ImageClusterMarker } from "./ImageClusterMarker";

type ImageClustersProps = {
  geoJson: GeoJson<GeoJsonImageFeature>;
};

const superclusterOptions: Supercluster.Options<
  GeoJsonImageFeature["properties"],
  ClusterProperties
> = {
  extent: 256,
  radius: 80,
  maxZoom: 12,
};

export function ImageClusters({ geoJson }: ImageClustersProps) {
  const { clusters, getClusterExpansionZoom } = useSupercluster(
    geoJson,
    superclusterOptions,
  );

  const handleClusterClick = useCallback(
    (
      marker: google.maps.marker.AdvancedMarkerElement,
      clusterId: number,
      lat: number,
      lng: number,
    ) => {
      const expansionZoom = Math.min(getClusterExpansionZoom(clusterId), 20);
      const map = marker.map;
      map?.setZoom?.(expansionZoom);
      map?.panTo?.({ lat, lng });
    },
    [getClusterExpansionZoom],
  );
  return (
    <>
      {clusters.map((feature) => {
        const coordinates = feature.geometry.coordinates;
        const [lng, lat] = coordinates;
        if (lng === undefined || lat === undefined) return null;

        const clusterProperties = feature.properties as ClusterProperties;
        const isCluster: boolean = clusterProperties.cluster;

        return isCluster ? (
          <ImageClusterMarker
            key={feature.id}
            clusterId={clusterProperties.cluster_id}
            position={{ lat, lng }}
            size={clusterProperties.point_count}
            sizeAsText={String(clusterProperties.point_count_abbreviated)}
            onMarkerClick={(marker, clusterId) =>
              handleClusterClick(marker, clusterId, lat, lng)
            }
          />
        ) : (
          <ImageMarker
            key={feature.id}
            featureId={String(feature.id)}
            position={{ lat, lng }}
            feature={
              feature as Feature<Point, GeoJsonImageFeature["properties"]>
            }
          />
        );
      })}
    </>
  );
}
