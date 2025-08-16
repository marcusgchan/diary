import { Posts } from "~/app/_lib/post/components/EditPosts";
import { PostLoader } from "~/app/_lib/post/components/PostsLoader";
import { PostsProvider } from "~/app/_lib/post/contexts/PostsContext";

export default async function Entry(props: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  return (
    <PostsProvider>
      <PostLoader>
        <Posts />
      </PostLoader>
    </PostsProvider>
  );
}
