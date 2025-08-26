import "../globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Login - Diary App",
  description: "Sign in to your diary app",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  );
}
