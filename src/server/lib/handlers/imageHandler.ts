import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { ImageService } from "../repositories/image";
import { getPresignedPost } from "../integrations/s3Service";
import { getImageSignedUrl } from "../integrations/s3Service";
import { insertImageMetadata, insertImageMetadataWithGps } from "../service";
import { getImageUploadStatus } from "../service";
import { getUnlinkedImages } from "../service";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { randomUUID } from "crypto";
import type { GeoJson, GeoJsonImageFeature } from "../types";
import {
  type CreatePresignedPostUrlInput,
  type GetPresignedUrlInput,
  type ConfirmImageUploadInput,
  type CancelImageUploadInput,
  type SaveImageMetadataInput,
  type GetImagesByEntryId,
  type GetImageUploadStatusInput,
  type GetMultipleImageUploadStatusInput,
  type GetImageUrlInput,
  type DeleteImageMetadataInput,
} from "../schema";

export async function createPresignedPostUrlHandler(
  ctx: ProtectedContext,
  input: CreatePresignedPostUrlInput,
) {
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry does not exist",
    });
  }

  const uuid = randomUUID();
  const url = await getPresignedPost(
    ctx.session.user.id,
    input.diaryId,
    input.entryId,
    uuid,
    {
      name: input.imageMetadata.name,
      size: input.imageMetadata.size,
      type: input.imageMetadata.mimetype,
    },
  );

  return url;
}

export async function getPresignedUrlHandler(
  ctx: ProtectedContext,
  input: GetPresignedUrlInput,
) {
  const uuid = randomUUID();
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry with this date already exists",
    });
  }

  const lat = input.gps.lat;
  const lon = input.gps.lon;
  const dateTimeTaken = input.dateTimeTaken;
  let formattedDate = undefined;

  const segments = dateTimeTaken?.split(" ");
  if (segments) {
    const date = segments[0]?.replaceAll(":", "/");
    const time = segments[1];
    if (date !== undefined && time !== undefined) {
      formattedDate = `${date} ${time}`;
    }
  }

  const indexOfDot = input.imageMetadata.name.lastIndexOf(".");

  if (lat !== undefined && lon !== undefined) {
    await insertImageMetadataWithGps({
      db: ctx.db,
      userId: ctx.session.user.id,
      key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name.slice(0, indexOfDot)}`,
      lon,
      lat,
      dateTimeTaken: formattedDate,
    });
  } else {
    await insertImageMetadata({
      db: ctx.db,
      userId: ctx.session.user.id,
      entryId: input.entryId,
      key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name.slice(0, indexOfDot)}`,
      dateTimeTaken: formattedDate,
    });
  }

  const url = await getPresignedPost(
    ctx.session.user.id,
    input.diaryId,
    input.entryId,
    uuid,
    input.imageMetadata,
  );

  return url;
}

export async function confirmImageUploadHandler(
  ctx: ProtectedContext,
  input: ConfirmImageUploadInput,
): Promise<void> {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  //
  // confirmImageUpload({ db: ctx.db, key: input.key });
}

export async function cancelImageUploadHandler(
  ctx: ProtectedContext,
  input: CancelImageUploadInput,
): Promise<void> {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  // const s3Service = new S3ImageService(ctx);
  // await Promise.all([
  //   s3Service.deleteImage(input.key),
  //   cancelImageUpload({
  //     db: ctx.db,
  //     key: input.key,
  //   }),
  // ]);
}

export async function saveImageMetadataHandler(
  ctx: ProtectedContext,
  input: SaveImageMetadataInput,
): Promise<null> {
  await insertImageMetadata({
    db: ctx.db,
    userId: ctx.session.user.id,
    entryId: input.entryId,
    key: input.key,
  });
  return null;
}

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

export async function getImageUploadStatusHandler(
  ctx: ProtectedContext,
  input: GetImageUploadStatusInput,
): Promise<"uploaded" | "pending" | false> {
  if (!input.key) {
    return false;
  }
  const status = await getImageUploadStatus({ db: ctx.db, key: input.key });
  return status;
}

export async function getMultipleImageUploadStatusHandler(
  ctx: ProtectedContext,
  input: GetMultipleImageUploadStatusInput,
) {
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const unlinked = await getUnlinkedImages({
    db: ctx.db,
    keys: input.keys,
    entryId: input.entryId,
  });

  const unlinkedTransformed = unlinked
    .filter((el) => input.keyToIdMap.get(el.key) !== undefined)
    .map((el) => {
      const id = input.keyToIdMap.get(el.key);
      if (id === undefined) {
        throw new Error();
      }

      if (el.compressionStatus === "failure") {
        return [id, { type: "compression_failure", key: el.key }] as const;
      }

      return [id, { type: "success", key: el.key }] as const;
    });

  const resultMap = new Map<
    string,
    | { type: "success"; key: string }
    | { type: "compression_failure"; key: string }
  >();

  for (const [key, value] of unlinkedTransformed) {
    resultMap.set(key, value);
  }

  return resultMap;
}

export async function getImageUrlHandler(input: GetImageUrlInput) {
  return await getImageSignedUrl(input);
}

export async function deleteImageMetadataHandler(
  ctx: ProtectedContext,
  input: DeleteImageMetadataInput,
) {
  // TODO: Uncomment and implement when image service is ready
  // const imageService = new ImageService(ctx);
  // const [key] = await imageService.getKeyByKey(input.key);
  // if (!key) {
  //   throw new TRPCError({ code: "NOT_FOUND" });
  // }
  //
  // const s3Service = new S3ImageService(ctx);
  // await Promise.all([
  //   s3Service.deleteImage(input.key),
  //   deleteImageMetadata({
  //     db: ctx.db,
  //     key: input.key,
  //   }),
  // ]);

  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
