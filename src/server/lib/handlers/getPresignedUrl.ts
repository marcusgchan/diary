import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { getPresignedPost } from "../integrations/s3Service";
import { insertImageMetadata, insertImageMetadataWithGps } from "../service";
import { randomUUID } from "crypto";
import { type GetPresignedUrlInput } from "../schema";

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
