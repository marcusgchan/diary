export { ImageDomainService } from "./service";
import { ImageDomainService } from "./service";
import type { ImageKeys } from "~/server/db/schema";

// Re-export the functions needed for API routes
export async function createMetadataOnImageCallback({
  entryId,
  key,
  name,
  mimetype,
  size,
  gps,
  compressionStatus,
  dateTimeTaken,
  userId,
  db,
}: {
  entryId: number;
  key: string;
  name: string;
  mimetype: string;
  size: number;
  gps?: { lat: number; lon: number };
  compressionStatus: ImageKeys["compressionStatus"];
  dateTimeTaken?: string | undefined;
  userId: string;
  db: any;
}) {
  // Create a minimal context object for the service
  const mockContext = {
    session: { user: { id: userId } },
    db,
    log: () => {},
    tracer: { startActiveSpan: () => {} },
  } as any;

  const imageService = new ImageDomainService(mockContext);
  await imageService.createMetadataOnImageCallback({
    entryId,
    key,
    name,
    mimetype,
    size,
    gps,
    compressionStatus,
    dateTimeTaken,
  });
}
