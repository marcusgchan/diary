"use client";

import { useState } from "react";
import { cn } from "~/app/_utils/cx";

type Post = {
  title: string;
  description: string;
  image: string;
  location?: {
    lon: number;
    lat: number;
  };
};

type Edit = {
  leftPageContent?: React.ReactNode;
  rightPageContent?: React.ReactNode;
};

type View = {
  firstPageHeader: React.ReactNode;
  posts: Post[];
};

export function Book(props: Edit | View) {
  const [first, setLeftPage] = useState(0);
  const second = first + 1;
  const third = first + 2;

  if (!("posts" in props)) {
    const { leftPageContent, rightPageContent } = props;
    return (
      <Cover>
        <LeftPage>{leftPageContent}</LeftPage>
        <RightPage>{rightPageContent}</RightPage>
      </Cover>
    );
  }

  const { posts, firstPageHeader } = props;

  return (
    <Cover>
      <LeftPage>
        <div className="grid gap-4">
          {firstPageHeader}
          <div className="grid">
            <Post post={posts[first]} />
            {/* <Post post={posts[second]} /> */}
          </div>
        </div>
      </LeftPage>
      <RightPage>
        <div className="grid gap-6">
          <div className="flex items-end gap-2">
            <Post className="rotate-3" post={posts[second]} />
            <div>
              <label>Upload Image</label>
              <button type="button" className="bg-gray-400 px-8 py-2">
                +
              </button>
            </div>
          </div>
          <div className="aspect-square w-[300px] justify-self-end bg-gray-400">
            fake map lol
          </div>
        </div>
      </RightPage>
    </Cover>
  );
}

function Post({
  post,
  className,
}: {
  post: Post | undefined;
  className?: string;
}) {
  if (!post) {
    return (
      <div className={cn("aspect-square w-[250px] bg-gray-500", className)}>
        placeholder
      </div>
    );
  }

  return (
    <div className={cn("grid w-fit gap-2 bg-gray-400 p-2", className)}>
      <h3 className="text-lg">{post.title}</h3>
      <div className="aspect-square w-[250px] bg-gray-500"></div>
      <p>{post.description}</p>
    </div>
  );
}

function LeftPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid rounded-bl-lg rounded-tl-lg bg-[#E9E6C9] pl-2">
      <div className="origin-right rounded-bl-lg rounded-tl-lg bg-[#f9f6d9] p-6 transition-all [backface-visibility:hidden] [perspective:800px] [transform-style:preserve-3d]">
        {children}
      </div>
    </div>
  );
}

function RightPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid rounded-br-lg rounded-tr-lg bg-[#E9E6C9] pr-2">
      <div className="rounded-br-lg rounded-tr-lg bg-[#f9f6d9] p-6">
        {children}
      </div>
    </div>
  );
}

function Cover({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid h-full min-h-[600px] grid-cols-2 rounded-lg bg-black px-3 py-2 after:absolute after:inset-0 after:bottom-2 after:left-1/2 after:top-2 after:w-[10px] after:-translate-x-1/2 after:bg-[#E9E6C9] after:opacity-50">
      {children}
    </div>
  );
}
