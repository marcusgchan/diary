"use client";
import { useParams, useRouter } from "next/navigation";
import { CSSProperties } from "react";
import { cn } from "~/app/_utils/cx";
import { RouterInputs, RouterOutputs } from "~/server/api/trpc";
import { api } from "~/trpc/TrpcProvider";
import { TitleInput } from "../TitleInput";
import { DatePicker } from "../DatePicker";
import { PostsForm } from "./edit/PostsForm";

export function PostsSection() {
  const params = useParams();
  const diaryId = Number(params.diaryId);
  const entryId = Number(params.entryId);

  const { data, isError } = api.diary.getEntryMap.useQuery({
    entryId: Number(params.entryId),
  });

  const router = useRouter();
  const queryUtils = api.useUtils();
  const createPostMutation = api.diary.createPosts.useMutation({
    async onSuccess() {
      // router.push(`/diaries/${diaryId}/entries/${entryId}`);
      await queryUtils.diary.getEntryMap.invalidate({ entryId });
    },
  });

  function mutate(data: RouterInputs["diary"]["createPosts"]) {
    createPostMutation.mutate(data);
  }

  if (data && data.posts.length === 0) {
    return (
      <section className="grid gap-3">
        <TitleInput title={data.header.title} />
        <DatePicker day={data.header.day} />
        <PostsForm
          diaryId={Number(params.diaryId)}
          entryId={Number(params.entryId)}
          mutate={mutate}
        />
      </section>
    );
  }

  if (data) {
    return (
      <section className="grid gap-3">
        <TitleInput title={data.header.title} />
        <DatePicker day={data.header.day} />
        <div className="grid grid-cols-[max-content_100px_max-content] [grid-auto-rows:50px_auto_auto]">
          <Posts posts={data.posts} />
          <Curves postsLength={data.posts.length} />
        </div>
      </section>
    );
  }

  if (isError) {
    throw new Error("Something went wrong");
  }

  return "Loading";
}

type Posts = RouterOutputs["diary"]["getEntryMap"]["posts"];

type Post = Posts[number];

function Posts({ posts }: { posts: Posts }) {
  return posts.map((post, i) => {
    return (
      <Post
        className={cn(
          "[grid-row-end:span_3]",
          i % 2 == 0 && "col-start-1 col-end-2 bg-red-400",
          i % 2 == 1 && "col-start-3 col-end-4",
        )}
        styles={{ gridRowStart: 1 + i * 3 }}
        key={post.id}
        post={post}
      />
    );
  });
}

function Post({
  post,
  className,
  styles,
}: {
  post: Post;
  className?: string;
  styles?: CSSProperties | undefined;
}) {
  return (
    <div
      style={styles}
      className={cn("grid w-fit gap-2 bg-gray-400 p-2", className)}
    >
      <h3 className="text-lg">{post.title}</h3>
      <div className="aspect-square w-[250px] bg-gray-500">
        {post.image.success ? <img src={post.image.url} alt="" /> : <p>:(</p>}
      </div>
      <p>{post.description}</p>
    </div>
  );
}

function Curves({ postsLength }: { postsLength: number }) {
  return (
    postsLength > 1 &&
    Array.from({ length: postsLength - 1 }).map((_, i) => {
      return (
        <>
          <div
            style={{ gridRowStart: 3 + i * 3 }}
            key={i}
            className={cn(
              i % 2 == 1 && "[rotate:y_180deg]",
              "col-start-2 col-end-3 [grid-row-end:span_3]",
            )}
          >
            <Curve
              style={{
                strokeDasharray: 10,
                strokeDashoffset: 0,
              }}
            />
          </div>
          <div
            style={{ gridRowStart: 3 + i * 3 }}
            key={i}
            className={cn(
              i % 2 == 1 && "[rotate:y_180deg]",
              "col-start-2 col-end-3 [grid-row-end:span_3]",
            )}
          >
            <Curve
              style={{
                animationName: "path",
                strokeDasharray: 200,
                strokeDashoffset: 200,
                strokeWidth: "2px",
                animationDelay: `${0.5 + i}s`,
                animationFillMode: "forwards",
                animationDuration: "1s",
              }}
            />
          </div>
        </>
      );
    })
  );
}

function Curve({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 31 71"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      xmlSpace="preserve"
      // xmlns:serif="http://www.serif.com/"
      // style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeMiterlimit: "1.5",
      }}
    >
      <g transform="matrix(1,0,0,1,-134.74,-89.7073)">
        <g transform="matrix(0.5,0,0,0.5,-1.8305,5.42878)">
          <path
            d="M273.641,169.057C299.303,169.112 303.702,194.617 303.644,239.142C303.584,285.02 308.092,309.293 333.647,309.227"
            // style="fill:none;stroke:black;stroke-width:1px;"
            className={className}
            style={{
              fill: "none",
              stroke: "black",
              strokeWidth: "1px",
              ...style,
            }}
          />
        </g>
      </g>
    </svg>
  );
}
