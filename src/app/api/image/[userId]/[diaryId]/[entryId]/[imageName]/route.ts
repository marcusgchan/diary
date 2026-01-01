import { headers } from "next/headers";
import {
  getImageSignedUrl,
  getImage,
} from "~/server/lib/integrations/s3Service";
import { auth } from "~/server/lib/services/auth";
import {
  getOptimizedImageKey,
  getClosestSize,
} from "~/app/_lib/utils/getCompressedImageKey";

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

  const key = `${params.userId}/${params.diaryId}/${params.entryId}/${params.imageName}`;

  // Check for optimization query params
  const { searchParams } = new URL(req.url);
  const width = searchParams.get("w");

  // No width param, just redirect to original S3 image
  if (!width) {
    const url = await getImageSignedUrl(key);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const targetWidth: number = getClosestSize(parseInt(width, 10));

  // Try to get pre-generated optimized image
  const optimizedKey: string = getOptimizedImageKey(key, targetWidth);
  const optimizedImage = await getImage(optimizedKey);

  if (optimizedImage) {
    // Serve pre-generated image
    return new Response(optimizedImage.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // No pre-generated version exists, serve original from S3
  const url = await getImageSignedUrl(key);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
