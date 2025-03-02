import { api } from "~/trpc/server";
import { FormWrapper } from "./FormWrapper";

export default async function EditMapPage({
  params,
}: {
  params: { diaryId: string; entryId: string };
}) {
  await api.diary.getPostsForForm.prefetch({ entryId: Number(params.entryId) });

  return <FormWrapper />;
}
