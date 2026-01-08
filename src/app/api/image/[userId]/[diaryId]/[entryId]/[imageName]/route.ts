import { headers } from "next/headers";
import {
  getImage,
  S3FileNotFoundError,
} from "~/server/lib/integrations/s3Service";
import { auth } from "~/server/lib/services/auth";
import {
  getOptimizedImageKey,
  getClosestSize,
} from "~/app/_lib/utils/getCompressedImageKey";
import { tryCatch } from "~/app/_lib/utils/tryCatch";

export async function GET(
  req: Request,
  props: {
    params: Promise<{
      userId: string;
      diaryId: string;
      entryId: string;
      imageName: string;
    }>;
  },
) {
  const params = await props.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session && session.user.id !== params.userId)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  const key = `${session.user.id}/${params.diaryId}/${params.entryId}/${params.imageName}`;

  const { searchParams } = new URL(req.url);
  const width = searchParams.get("w");

  if (!width) {
    const originalImage = await getImage(key);
    if (!originalImage) {
      return Response.json({ message: "Image not found" }, { status: 404 });
    }
    // Buffer extends Uint8Array, which is part of BodyInit, so this is safe at runtime
    // TypeScript doesn't recognize the compatibility, hence the cast
    return new Response(originalImage.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": originalImage.mimetype,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  const targetWidth = getClosestSize(parseInt(width, 10));
  const optimizedKey = getOptimizedImageKey(key, targetWidth);
  const [err, optimizedImage] = await tryCatch(getImage(optimizedKey));
  if (err && !(err instanceof S3FileNotFoundError)) {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }

  if (!optimizedImage) {
    // Fallback to original if optimized version doesn't exist
    // This can happen if requested width > original image size
    const originalImage = await getImage(key);
    if (!originalImage) {
      return Response.json({ message: "Image not found" }, { status: 404 });
    }
    return new Response(originalImage.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": originalImage.mimetype,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  // Serve pre-generated image
  // Buffer extends Uint8Array, which is part of BodyInit, so this is safe at runtime
  // TypeScript doesn't recognize the compatibility, hence the cast
  return new Response(optimizedImage.buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
