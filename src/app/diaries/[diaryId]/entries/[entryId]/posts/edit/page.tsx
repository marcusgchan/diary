import { api } from "~/trpc/server";
import { EditPosts } from "~/app/_lib/post/EditPosts";
import { PostsProvider } from "~/app/_lib/post/PostsContext";

export default async function EditMapPage(props: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const params = await props.params;
  await api.diary.getPostsForForm.prefetch({ entryId: Number(params.entryId) });

  return (
    <PostsProvider>
      <EditPosts />
    </PostsProvider>
  );
}
