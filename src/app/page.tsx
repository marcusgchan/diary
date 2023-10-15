"use client";
import { api } from "./trpc/api";

export default function Home() {
  const { data, isLoading, isError } = api.example.hello.useQuery({
    text: "world",
  });
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {data?.greeting}
    </main>
  );
}
