import { CreateDiaryHeader } from "@/_lib/diary/components/CreateDiaryHeader";
import { DiaryList } from "@/_lib/diary/components/DiaryList";

export default function Diaries() {
  return (
    <div className="grid grid-cols-1 gap-5">
      <CreateDiaryHeader />
      <main className="h-full">
        <ul className="grid h-full grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
          <DiaryList />
        </ul>
      </main>
    </div>
  );
}
