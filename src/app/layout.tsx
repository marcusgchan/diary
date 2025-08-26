import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diary App",
  description: "Your personal diary application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
