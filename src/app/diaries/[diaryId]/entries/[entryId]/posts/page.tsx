import { PostsSection } from "./Posts";

export default async function Entry(
  props: {
    params: Promise<{ diaryId: string; entryId: string }>;
  }
) {
  const params = await props.params;

  const {
    entryId
  } = params;

  return <PostsSection />;
}
