import { api } from "~/trpc/server";
import { Posts } from "~/app/_lib/post/components/EditPosts";
import { PostsProvider } from "~/app/_lib/post/contexts/PostsContext";

export default async function EditMapPage(props: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const params = await props.params;
  await api.diary.getPosts.prefetch({ entryId: Number(params.entryId) });

  return (
    <PostsProvider>
      <Posts />
    </PostsProvider>
  );
}
