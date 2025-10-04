import { type ProtectedContext } from "~/server/trpc";
import { type GetImagesByEntryId } from "../schema";
import { EntryService } from "../repositories/entry";
import { TRPCError } from "@trpc/server";
import { ImageService } from "../repositories/image";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../integrations/s3Service";
import type { GeoJson, GeoJsonImageFeature } from "../types";

export async function getImagesByEntryId(
  ctx: ProtectedContext,
  input: GetImagesByEntryId,
) {
  const entryRepo = new EntryService(ctx);
  const entry = await entryRepo.getEntryIdById(input.entryId);
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const imageRepo = new ImageService(ctx);
  const images = await imageRepo.getImagesByEntryId(input.entryId);

  const imageWithUrl = await Promise.all(
    images.map(async (image) => {
      const [err, data] = await tryCatch(getImageSignedUrl(image.key));
      if (err) {
        return {
          type: "failed" as const,
        };
      }

      return {
        type: "success" as const,
        url: data,
        ...image,
      };
    }),
  );

  const successfulImages = imageWithUrl.filter(
    (image) => image.type === "success",
  );

  const geoJson: GeoJson<GeoJsonImageFeature> = {
    type: "FeatureCollection",
    features: successfulImages.map((image) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [image.longitude, image.lattitude],
        },
        properties: {
          id: image.id,
          url: image.url,
          postId: image.postId,
        },
      };
    }),
  };

  return geoJson;
}
