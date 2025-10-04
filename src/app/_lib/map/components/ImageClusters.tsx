import type { GeoJson, GeoJsonImageFeature } from "~/server/lib/types";
import { useMapApi } from "./Map";
import { useEffect, useCallback } from "react";
import { type GeoJSONSource, type Map } from "maplibre-gl";

type ImageClustersProps = {
  geoJson: GeoJson<GeoJsonImageFeature>;
};

export function ImageClusters(props: ImageClustersProps) {
  const map = useMapApi();

  // Event handlers for cluster interactions
  const handleClusterClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });

      if (features.length > 0) {
        const clusterProperties = features[0]?.properties;
        if (clusterProperties) {
          // The first image ID is available in the cluster properties
          const firstImageId = clusterProperties.firstImageId as
            | string
            | undefined;
          // You can add custom logic here to show the first image
          // For example, open a modal, navigate to the image, etc.
        }
      }
    },
    [map],
  );

  const handleClusterMouseEnter = useCallback(() => {
    const mapInstance = map.current;
    if (mapInstance) {
      mapInstance.getCanvas().style.cursor = "pointer";
    }
  }, [map]);

  const handleClusterMouseLeave = useCallback(() => {
    const mapInstance = map.current;
    if (mapInstance) {
      mapInstance.getCanvas().style.cursor = "";
    }
  }, [map]);

  // Function to update cluster images based on their children
  const updateClusterImages = useCallback(() => {
    (async () => {
      if (!map.current) {
        return;
      }

      const clusters = map.current.queryRenderedFeatures({
        layers: ["clusters"],
        filter: ["has", "point_count"],
      });
      if (!clusters) {
        return;
      }

      const source = map.current.getSource("images");
      if (!source) {
        return;
      }

      for (const cluster of clusters) {
        const children = await (source as GeoJSONSource).getClusterLeaves(
          cluster.id as number,
          cluster.properties.point_count as number,
          0,
        );

        if (children.length === 0) {
          throw new Error("wat");
        }

        map.current.setFeatureState(
          { source: "images", id: cluster.id as number },
          { clusterImageId: children[0]!.id },
        );
      }
    })().catch((e) => {
      console.log(e);
    });
  }, [map]);

  useEffect(() => {
    const mapInstance = map.current;
    if (mapInstance === null) {
      return;
    }

    async function fetchImages(mapInstance: Map) {
      const imagesAllSettled = await Promise.allSettled(
        props.geoJson.features.map((feature) => {
          return new Promise<
            Pick<GeoJsonImageFeature["properties"], "id" | "postId"> & {
              data: HTMLImageElement | ImageBitmap;
            }
          >((resolve, reject) => {
            void mapInstance
              .loadImage(feature.properties.url)
              .then((imageResponse) => {
                resolve({
                  id: feature.properties.id,
                  postId: feature.properties.postId,
                  data: imageResponse.data,
                });
              })
              .catch((err) => reject(err as Error));
          });
        }),
      );

      const successfulImages = imagesAllSettled
        .filter((image) => image.status === "fulfilled")
        .map((image) => image.value);

      successfulImages.forEach((image) => {
        if (!mapInstance.hasImage(image.id)) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const size = 80; // Circle diameter
          canvas.width = size;
          canvas.height = size;

          ctx.clearRect(0, 0, size, size);

          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();

          const img = image.data as HTMLImageElement;
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          ctx.restore();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
          ctx.stroke();

          const imageData = ctx.getImageData(0, 0, size, size);
          mapInstance.addImage(image.id, imageData);
        }
      });

      // Add the source first
      if (!mapInstance.getSource("images")) {
        mapInstance.addSource("images", {
          type: "geojson",
          data: props.geoJson,
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50, // Radius of each cluster when clustering points
          clusterProperties: {
            clusterImageId: ["coalesce", ["get", "id"], "default"],
          },
        });
      }

      // Add unclustered points layer
      if (!mapInstance.getLayer("unclustered-points")) {
        mapInstance.addLayer({
          id: "unclustered-points",
          type: "symbol",
          source: "images",
          filter: ["!has", "point_count"],
          layout: {
            "icon-image": ["get", "id"],
            "icon-size": 1.0,
            "icon-allow-overlap": true,
            "icon-padding": 0,
          },
          paint: {
            "icon-opacity": 1,
          },
        });
      }

      // Add cluster circles
      if (!mapInstance.getLayer("clusters")) {
        mapInstance.addLayer({
          id: "clusters",
          type: "symbol",
          source: "images",
          filter: ["all", ["has", "point_count"]],
          layout: {
            "icon-image": ["get", "clusterImageId"],
            "icon-size": 1,
            "icon-allow-overlap": true,
          },
          paint: {},
        });
      }

      // For now, let's just show circles with counts
      // The first image approach is complex with MapLibre GL clustering

      // Add white circle background for cluster count
      if (!mapInstance.getLayer("cluster-count-bg")) {
        mapInstance.addLayer({
          id: "cluster-count-bg",
          type: "circle",
          source: "images",
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": 10,
            "circle-color": "#ffffff",
            "circle-translate": [28, -28],
          },
        });
      }

      // Add cluster count text
      if (!mapInstance.getLayer("cluster-count")) {
        mapInstance.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "images",
          filter: ["has", "point_count"],
          layout: {
            "text-field": [
              "step",
              ["get", "point_count"],
              "",
              2,
              [
                "step",
                ["get", "point_count"],
                ["get", "point_count"],
                99,
                "99+",
              ],
            ],
            "text-size": 12,
            "text-anchor": "top-left",
            "text-offset": [2.1, -2.9],
            "text-allow-overlap": true,
            "text-font": ["Noto Sans Regular"],
          },
          paint: {
            "text-color": "#000000",
          },
        });
      }

      // Add event listeners for cluster interactions
      mapInstance.on("click", "clusters", handleClusterClick);
      mapInstance.on("mouseenter", "clusters", handleClusterMouseEnter);
      mapInstance.on("mouseleave", "clusters", handleClusterMouseLeave);

      // Update cluster images on map movements
      mapInstance.on("moveend", updateClusterImages);
      mapInstance.on("zoomend", updateClusterImages);

      // Initial update
      void mapInstance.once("idle", updateClusterImages);
    }

    void fetchImages(mapInstance);

    return () => {
      const currentMap = mapInstance;
      if (currentMap && !currentMap._removed) {
        try {
          // Remove event listeners
          currentMap.off("click", "clusters", handleClusterClick);
          currentMap.off("mouseenter", "clusters", handleClusterMouseEnter);
          currentMap.off("mouseleave", "clusters", handleClusterMouseLeave);
          currentMap.off("moveend", updateClusterImages);
          currentMap.off("zoomend", updateClusterImages);

          // Remove layers
          if (currentMap.getLayer("unclustered-points")) {
            currentMap.removeLayer("unclustered-points");
          }
          if (currentMap.getLayer("clusters")) {
            currentMap.removeLayer("clusters");
          }
          if (currentMap.getLayer("cluster-count")) {
            currentMap.removeLayer("cluster-count");
          }
          if (currentMap.getLayer("cluster-count-bg")) {
            currentMap.removeLayer("cluster-count-bg");
          }
          if (currentMap.getSource("images")) {
            currentMap.removeSource("images");
          }
        } catch (error) {
          console.warn("Error cleaning up map layers/sources:", error);
        }
      }
    };
  }, [
    map,
    props.geoJson,
    handleClusterClick,
    handleClusterMouseEnter,
    handleClusterMouseLeave,
    updateClusterImages,
  ]);
  return null;
}
