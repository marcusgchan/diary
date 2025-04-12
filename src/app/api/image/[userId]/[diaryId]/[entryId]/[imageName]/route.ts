import { getImageSignedUrl } from "~/server/api/features/shared/s3ImagesService";
import { getServerAuthSession } from "~/server/auth";

export async function GET(
  _: Request,
  props: {
    params: Promise<{
      userId: string;
      diaryId: string;
      entryId: string;
      imageName: string;
    }>;
  }
) {
  const params = await props.params;
  const session = await getServerAuthSession();
  if (!session || (session && session.user.id !== params.userId)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = await getImageSignedUrl(
    `${params.userId}/${params.diaryId}/${params.entryId}/${params.imageName}`,
  );

  return Response.redirect(url);
}
