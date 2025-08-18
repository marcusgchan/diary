"use client";

import { useParams, useRouter } from "next/navigation";
import { type GetPostImage } from "~/server/features/diary/types";
import { api } from "~/trpc/TrpcProvider";
import { Button } from "../../ui/button";
import { EditPosts } from "./EditPosts";

export function Posts() {
  return (
    <section className="overflow-auto">
      <PostsList />
    </section>
  );
}

function PostsList() {
  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);

  const { data: posts, isError } = api.diary.getPosts.useQuery({ entryId });

  if (posts && posts.length === 0) {
    return <EditPosts />;
  }

  if (posts) {
    return (
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="space-y-2">
            {post.title.length > 0 && <h3 className="text-lg">{post.title}</h3>}
            <ImageList images={post.images} />
            {post.description.length > 0 && <p>{post.description}</p>}
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return "Something went wrong";
  }

  return "Loading...";
}

type ImageListProps = { images: GetPostImage[] };

function ImageList({ images }: ImageListProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {images.map((image) => (
        <li key={image.id} className="flex-shrink-0">
          <ImageLoader image={image} />
        </li>
      ))}
    </ul>
  );
}

type ImageLoaderProps = {
  image: GetPostImage;
};

function ImageLoader({ image }: ImageLoaderProps) {
  if (image.type === "error") {
    return (
      <p className="aspect-[4/3] w-[300px]">
        Unable to load image: {image.name}
      </p>
    );
  }

  return (
    <img className="aspect-[4/3] w-[300px]" alt={image.name} src={image.url} />
  );
}
