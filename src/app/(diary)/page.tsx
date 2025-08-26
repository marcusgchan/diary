import Link from "next/link";

export default function Home() {
  return (
    <main className="flex h-full items-center justify-center">
      <Link href="/diaries">Go To Diaries</Link>
    </main>
  );
}
