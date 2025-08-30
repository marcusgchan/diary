import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/lib/utils/auth";
import { SessionProvider } from "./AuthContext";

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/sign-in");
  }

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
