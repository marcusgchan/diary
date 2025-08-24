import type {
  EditPostGroupByNonEmptyImages,
  EditPostWithNonEmptyImageState,
} from "../types";

export function postsView(
  posts: EditPostWithNonEmptyImageState[],
): EditPostGroupByNonEmptyImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      acc.set(cur.id, {
        ...cur,
        images: [{ ...cur.image }],
      });
    }
    return acc;
  }, new Map<string, EditPostGroupByNonEmptyImages>());

  const postArray = Array.from(postMap.values());

  return postArray.length === 0
    ? [
        {
          id: crypto.randomUUID(),
          order: 0,
          title: "",
          isSelected: true,
          description: "",
          images: [],
        },
      ]
    : postArray;
}
