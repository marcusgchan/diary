import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { diariesToUsers } from "~/server/db/schema";

export default async function Diary({
  params,
}: {
  params: { diaryId: string };
}) {
  const session = await getServerAuthSession();
  const headersList = headers();
  const url = headersList.get("x-url");
  if (session === null) {
    if (url !== null) {
      return redirect(`/api/auth/signin?redirect=${encodeURIComponent(url)}`);
    }
    redirect("/api/auth/signin");
  }

  const row = await db
    .select({ diaryId: diariesToUsers.diaryId })
    .from(diariesToUsers)
    .where(
      and(
        eq(diariesToUsers.userId, session.user.id),
        eq(diariesToUsers.diaryId, Number(params.diaryId)),
      ),
    )
    .limit(1);

  if (row.length > 0) {
    redirect(`/diaries/${params.diaryId}/entries`);
  }

  return <p>Diary does not exist</p>;
}
