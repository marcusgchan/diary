"use client";

import { useParams } from "next/navigation";
import FetchResolver from "~/app/_components/FetchResolver";
import { api } from "~/trpc/client";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "~/app/_components/ui/button";
import { cn } from "~/app/_utils/cx";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { RouterOutputs } from "~/server/api/trpc";
import { useToast } from "~/app/_components/ui/use-toast";
import dynamic from "next/dynamic";
import { Entries } from "../Entries";
import { Header } from "../Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Editor = dynamic(
  () => import("./Editor").then((c) => ({ default: c.Editor })),
  { ssr: false },
);

type Entry = NonNullable<RouterOutputs["diary"]["getEntry"]>;

export default function Entry() {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const entryQuery = api.diary.getEntry.useQuery(
    {
      entryId: Number(entryId),
      diaryId: Number(diaryId),
    },
    {
      refetchOnWindowFocus: false,
    },
  );
  return (
    <div className="flex h-full flex-col gap-4">
      <Header />
      <div className="grid h-full min-h-0 flex-1 gap-2 sm:grid-cols-[220px_1fr]">
        <aside className="hidden sm:block">
          <h3 className="mb-2 text-2xl">Diary Entries</h3>
          <Entries />
        </aside>
        <div className="h-full min-h-0 min-w-0">
          <FetchResolver
            {...entryQuery}
            loadingComponent={
              <main className="flex h-full flex-col gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-full w-full" />
              </main>
            }
          >
            {(data) => {
              return !data ? (
                <main>Doesn&#39;t exist</main>
              ) : (
                <main className="flex h-full flex-col gap-2">
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
                      <Editor initialEditorState={data.editorState} />
                    </TabsContent>
                  </Tabs>
                </main>
              );
            }}
          </FetchResolver>
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

function TitleInput(props: { title: Entry["title"] }) {
  const { diaryId, entryId } = useParams();
  const [title, setTitle] = useState(props.title ?? "");
  const queryUtils = api.useContext();
  const saveTitleMutation = api.diary.updateTitle.useMutation({
    onSuccess(data) {
      queryUtils.diary.getEntry.setData(
        { diaryId: Number(diaryId), entryId: Number(entryId) },
        (old) => {
          if (old) {
            return { ...old, title: data };
          }
          return old;
        },
      );
    },
  });
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setTitle(title);
    saveTitleMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      title: title,
    });
  }
  return (
    <input
      className="bg-transparent text-2xl"
      value={title}
      onChange={handleTitleChange}
      placeholder="Enter a title..."
    />
  );
}

function DatePicker({ day }: { day: string }) {
  const params = useParams();
  const diaryId = params.diaryId;
  const entryId = params.entryId;
  const [date, setDate] = useState(parseISO(day));
  const { toast } = useToast();
  const queryUtils = api.useContext();
  const updateEntryDateMutation = api.diary.updateEntryDate.useMutation({
    async onSuccess(data) {
      await queryUtils.diary.getEntry.invalidate({
        entryId: Number(entryId),
        diaryId: Number(diaryId),
      });
      await queryUtils.diary.getEntries.invalidate({
        diaryId: Number(diaryId),
      });
      setDate(new Date(parseISO(data.day)));
    },
    onError(e) {
      toast({ variant: "destructive", title: e.message });
    },
  });
  function handleChangeDate(date: Date | undefined) {
    const updatedDate = date ?? parseISO(day);
    updateEntryDateMutation.mutate({
      diaryId: Number(diaryId),
      entryId: Number(entryId),
      day: updatedDate.toLocaleDateString("en-CA"),
    });
    setIsOpen(false);
  }
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={updateEntryDateMutation.isLoading}
          variant={"outline"}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleChangeDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
