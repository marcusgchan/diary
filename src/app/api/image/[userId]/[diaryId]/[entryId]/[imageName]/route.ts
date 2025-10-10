import { headers } from "next/headers";
import { getImageSignedUrl } from "~/server/lib/integrations/s3Service";
import { auth } from "~/server/lib/services/auth";

export async function GET(
  _: Request,
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

  const url = await getImageSignedUrl(
    `${params.userId}/${params.diaryId}/${params.entryId}/${params.imageName}`,
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}
