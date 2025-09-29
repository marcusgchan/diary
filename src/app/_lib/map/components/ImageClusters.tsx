import type { GeoJson, GeoJsonImageFeature } from "~/server/lib/types";
import { useMapApi } from "./Map";
import { useEffect } from "react";
import { type Map } from "maplibre-gl";

type ImageClustersProps = {
  geoJson: GeoJson<GeoJsonImageFeature>;
};

export function ImageClusters(props: ImageClustersProps) {
  const map = useMapApi();

  useEffect(() => {
    console.log(
      "ImageClusters mount - features:",
      props.geoJson.features.length,
    );
    const mapInstance = map.current;
    if (mapInstance === null) {
      console.log("ImageClusters: mapInstance is null");
      return;
    }

    async function fetchImages(mapInstance: Map) {
      // Style is already loaded when this component mounts (guaranteed by Map component)

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

      if (!mapInstance.getSource("images")) {
        mapInstance.addSource("images", {
          type: "geojson",
          data: props.geoJson,
        });
      }

      if (!mapInstance.getLayer("image-symbol")) {
        mapInstance.addLayer({
          id: "image-symbol",
          type: "symbol",
          source: "images",
          layout: {
            "icon-image": ["get", "id"],
            "icon-size": 1.0,
            "icon-allow-overlap": true,
          },
          paint: {
            "icon-opacity": 1,
          },
        });
      }
    }

    void fetchImages(mapInstance);

    return () => {
      console.log("unmount");
      // Cleanup when component unmounts or dependencies change
      const currentMap = map.current;
      if (currentMap && !currentMap._removed) {
        try {
          if (currentMap.getLayer("image-symbol")) {
            currentMap.removeLayer("image-symbol");
          }
          if (currentMap.getSource("images")) {
            currentMap.removeSource("images");
          }
        } catch (error) {
          console.warn("Error cleaning up map layers/sources:", error);
        }
      }
      // Note: We don't remove images as they might be used by other components
    };
  }, [map, props.geoJson]);
  return null;
}
