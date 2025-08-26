import { PostsProvider } from "~/app/_lib/post/contexts/PostsContext";
import { PostLoader } from "~/app/_lib/post/components/PostsLoader";
import { EditPostsSection } from "~/app/_lib/post/components/EditPostsSection";

export default async function EditMapPage() {
  return (
    <PostsProvider>
      <PostLoader>
        <EditPostsSection />
      </PostLoader>
    </PostsProvider>
  );
}
