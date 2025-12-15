import "../globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "~/trpc/TrpcProvider";
import Link from "next/link";
import { Toaster as Toaster_Old } from "../_lib/ui/toaster";
import { AuthGuard } from "../_lib/auth/AuthGuard";
import { ProfileAvatar } from "../_lib/profile/components/ProfileAvatar";
import { InitMapLibre } from "../_lib/map/components/InitMapLibre";
import { Toaster } from "@/_lib/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Memory Map",
  description: "Memory application",
};

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <InitMapLibre />
        <AuthGuard>
          <div className="mx-auto h-full max-w-7xl">
            <div className="flex h-full flex-col gap-4 p-4">
              <header>
                <nav className="flex justify-between">
                  <h1 className="text-4xl">Mnemodi</h1>
                  <ul className="flex items-center gap-2">
                    <li className="flex items-center">
                      <Link href="/">Home</Link>
                    </li>
                    <li className="flex items-center">
                      <Link href="/diaries">Diaries</Link>
                    </li>
                    <li className="flex items-center">
                      <ProfileAvatar />
                    </li>
                  </ul>
                </nav>
              </header>
              <div className="h-full min-h-0 flex-1">
                <TRPCProvider>{children}</TRPCProvider>
              </div>
            </div>
            <Toaster />
            <Toaster_Old />
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
