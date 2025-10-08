import type {
  GetPostWithImageState,
  GetPostGroupByImages,
  EditPostWithNonEmptyImageState,
  EditPostGroupByNonEmptyImages,
} from "../types";

export function postsView(
  posts: GetPostWithImageState[],
): GetPostGroupByImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      const { image, ...rest } = cur;
      acc.set(cur.id, {
        ...rest,
        images: [{ ...image }],
      });
    } else {
      post.images.push(cur.image);
    }
    return acc;
  }, new Map<string, GetPostGroupByImages>());

  const postArray = Array.from(postMap.values());
  return postArray;
}

export function postsViewForForm(
  posts: EditPostWithNonEmptyImageState[],
): EditPostGroupByNonEmptyImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      acc.set(cur.id, {
        ...cur,
        images: [{ ...cur.image }],
      });
    } else {
      post.images.push(cur.image);
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
