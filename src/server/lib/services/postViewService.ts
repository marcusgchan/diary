import type {
  GetPostQuery,
  GetPostFormQuery,
  PostForm,
  Post,
  PostFormLoadedImage,
} from "../types";

export function postsView(posts: GetPostQuery[]): Post[] {
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
  }, new Map<string, Post>());

  const postArray = Array.from(postMap.values());
  return postArray;
}

export function postsViewForForm(posts: GetPostFormQuery[]): PostForm[] {
  const postMap = posts
    .map((post) => {
      const { image, ...restOfPost } = post;
      return {
        ...restOfPost,
        isSelected: restOfPost.order === 0,
        image: {
          ...image,
          type: "loaded",
          isSelected: image.order === 0,
        } satisfies PostFormLoadedImage,
      };
    })
    .reduce((acc, cur) => {
      const post = acc.get(cur.id);
      const { image, ...rest } = cur;
      if (!post) {
        acc.set(cur.id, {
          ...rest,
          images: [{ ...image }],
        });
      } else {
        post.images.push(cur.image);
      }
      return acc;
    }, new Map<string, PostForm>());

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
