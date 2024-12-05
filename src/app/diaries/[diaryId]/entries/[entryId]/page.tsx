import { RouterOutputs } from "~/server/api/trpc";
import { Entries } from "../Entries";
import { Header } from "../Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiaryEntry } from "./DiaryEntry";
import { TitleInput } from "./TitleInput";
import { DatePicker } from "./DatePicker";
import { getEntryTitleDayById } from "~/server/api/features/diary/service";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

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
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid h-full min-h-0 flex-1 gap-2 sm:grid-cols-[220px_1fr]">
        <aside className="hidden sm:block">
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <Entries />
        </aside>
        <div className="h-full min-h-0 min-w-0">
          <main className="flex h-full flex-col gap-2">
            {data ? (
              <>
                <TitleInput title={data.title} />
                <DatePicker day={data.day} />
                <Tabs defaultValue="images" className="flex h-full flex-col">
                  <TabsList className="self-start">
                    <TabsTrigger value="images">Images</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="images"
                    className="grid grid-cols-1 lg:grid-cols-2"
                  >
                    <Images />
                    <Map />
                  </TabsContent>
                  <TabsContent value="text" className="h-full">
                    <DiaryEntry />
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <p>not exist</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Images() {
  return (
    <div>
      <h4 className="mb-2 text-xl">Image Entries</h4>
      <ul className="grid gap-4">
        <li>
          <article>
            <h5 className="mb-2 text-xl">Title</h5>
            <div className="aspect-square w-[400px] rounded bg-gray-50"></div>
            <p>the quick brown fox jumps over the lazy dog</p>
          </article>
        </li>
        <li>
          <article>
            <h5 className="mb-2 text-xl">Title</h5>
            <div className="aspect-square w-[400px] rounded bg-gray-50"></div>
            <p>the quick brown fox jumps over the lazy dog</p>
          </article>
        </li>
      </ul>
    </div>
  );
}

function Map() {
  return (
    <div>
      <h4 className="mb-2 text-xl">Map</h4>
      <div className="aspect-square w-[400px] bg-gray-50"></div>
    </div>
  );
}
