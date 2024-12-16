import { RouterOutputs } from "~/server/api/trpc";
import EntryMapHeader from "./EntryMapHeader";
import { EditMapForm } from "./edit/EditMapForm";
import { Book } from "./Book";
import { TitleInput } from "../TitleInput";
import { DatePicker } from "../DatePicker";
import { getServerAuthSession } from "~/server/auth";
import { getEntryTitleDayById } from "~/server/api/features/diary/service";
import { db } from "~/server/db";
import { cn } from "~/app/_utils/cx";
import { CSSProperties } from "react";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

const posts = [
  {
    id: 1,
    title: "Title 1",
    description: "A short description one.",
    image: "",
  },
  {
    id: 2,
    title: "Title 2",
    description: " A short description 2.",
    image: "",
  },
  {
    id: 3,
    title: "Title 3",
    description: " A short description 2.",
    image: "",
  },
  {
    id: 4,
    title: "Title 4",
    description: " A short description 2.",
    image: "",
  },
];

export default async function Entry({
  params: { diaryId, entryId },
}: {
  params: { diaryId: string; entryId: string };
}) {
  const auth = await getServerAuthSession();

  const data = await getEntryTitleDayById({
    db,
    userId: auth?.user.id!,
    diaryId: Number(diaryId),
    entryId: Number(entryId),
  });

  return (
    <div className="grid gap-2">
      <EntryMapHeader />
      <TitleInput title={data!.title} />
      <DatePicker day={data!.day} />
      <h3 className="text-lg">My Image Entries</h3>
      <div className="grid grid-cols-[max-content_100px_max-content]">
        {posts.map((post, i) => {
          return (
            <Post
              className={cn(
                "[grid-row-end:span_2]",
                i % 2 == 0 && "col-start-1 col-end-2 bg-red-400",
                i % 2 == 1 && "col-start-3 col-end-4",
              )}
              styles={{ gridRowStart: 1 + i * 2 }}
              key={post.id}
              post={post}
            />
          );
        })}
        {posts.length > 1 &&
          Array.from({ length: posts.length - 1 }).map((_, i) => {
            return (
              <>
                <div
                  style={{ gridRowStart: 2 + i * 2 }}
                  key={i}
                  className={cn(
                    i % 2 == 1 && "[rotate:y_180deg]",
                    "col-start-2 col-end-3 [grid-row-end:span_2]",
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
                  style={{ gridRowStart: 2 + i * 2 }}
                  key={i}
                  className={cn(
                    i % 2 == 1 && "[rotate:y_180deg]",
                    "col-start-2 col-end-3 [grid-row-end:span_2]",
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
          })}
      </div>
      {/* <Book */}
      {/*   firstPageHeader={ */}
      {/*     <> */}
      {/*       <TitleInput title={data!.title} /> */}
      {/*       <DatePicker day={data!.day} /> */}
      {/*       <h3 className="text-lg">My Image Entries</h3> */}
      {/*     </> */}
      {/*   } */}
      {/*   posts={posts} */}
      {/* /> */}
    </div>
  );
}

type Post = {
  id: number;
  title: string;
  description: string;
  image: string;
  location?: {
    lon: number;
    lat: number;
  };
};
function Post({
  post,
  className,
  styles,
}: {
  post: Post | undefined;
  className?: string;
  styles?: CSSProperties | undefined;
}) {
  if (!post) {
    return (
      <div className={cn("aspect-square w-[250px] bg-gray-500", className)}>
        placeholder
      </div>
    );
  }

  return (
    <div
      style={styles}
      className={cn("grid w-fit gap-2 bg-gray-400 p-2", className)}
    >
      {/* <h3 className="text-lg">{post.title}</h3> */}
      <div className="aspect-square w-[250px] bg-gray-500"></div>
      {/* <p>{post.description}</p> */}
    </div>
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