import { Posts } from "~/app/_lib/post/components/Posts";
import { PostsProvider } from "~/app/_lib/post/contexts/PostsContext";

export default async function Entry() {
  return (
    <PostsProvider>
      <Posts />
    </PostsProvider>
  );
}
