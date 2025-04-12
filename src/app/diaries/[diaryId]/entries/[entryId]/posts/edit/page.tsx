import { api } from "~/trpc/server";
import { FormWrapper } from "./FormWrapper";

export default async function EditMapPage(
  props: {
    params: Promise<{ diaryId: string; entryId: string }>;
  }
) {
  const params = await props.params;
  await api.diary.getPostsForForm.prefetch({ entryId: Number(params.entryId) });

  return <FormWrapper />;
}
