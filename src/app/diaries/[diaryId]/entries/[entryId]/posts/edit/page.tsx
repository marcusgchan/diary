import { api } from "~/trpc/server";
import { FormWrapper } from "@/_lib/shared/FormWrapper";
import { EditPosts } from "~/app/_lib/post/EditPosts";

export default async function EditMapPage(props: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const params = await props.params;
  await api.diary.getPostsForForm.prefetch({ entryId: Number(params.entryId) });

  return <EditPosts />;
}
