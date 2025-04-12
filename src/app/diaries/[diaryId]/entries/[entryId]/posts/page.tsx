import { PostsSection } from "./Posts";

export default function Entry({
  params: { entryId },
}: {
  params: { diaryId: string; entryId: string };
}) {
  return <PostsSection />;
}
