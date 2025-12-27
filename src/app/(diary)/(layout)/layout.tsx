import Link from "next/link";
import { ProfileAvatar } from "../../_lib/profile/components/ProfileAvatar";

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <div className="h-full min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
