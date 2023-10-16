import Link from "next/link";

export default function Home() {
  return (
    <main className="flex h-full items-center justify-center">
      <Link href="/diary-entries">Go To Diary Entries</Link>
    </main>
  );
}
