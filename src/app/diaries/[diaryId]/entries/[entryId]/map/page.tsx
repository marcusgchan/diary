import { RouterOutputs } from "~/server/api/trpc";
import EntryMapHeader from "./EntryMapHeader";
import { EditMapForm } from "./edit/EditMapForm";
import { Book } from "./Book";
import { TitleInput } from "../TitleInput";
import { DatePicker } from "../DatePicker";
import { getServerAuthSession } from "~/server/auth";
import { getEntryTitleDayById } from "~/server/api/features/diary/service";
import { db } from "~/server/db";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

const posts = [
  {
    title: "Title 1",
    description: "A short description one.",
    image: "",
  },
  {
    title: "Title 2",
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
    <div>
      <EntryMapHeader />
      <Book
        firstPageHeader={
          <>
            <TitleInput title={data!.title} />
            <DatePicker day={data!.day} />
            <h3 className="text-lg">My Image Entries</h3>
          </>
        }
        posts={posts}
      />
    </div>
  );
}
