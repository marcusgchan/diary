"use client";

import { useSession } from "../../auth/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/_lib/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { authClient } from "../../utils/auth-client";
import { useRouter } from "next/navigation";

export function ProfileAvatar() {
  const session = useSession();
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Avatar>
            <AvatarImage src={session.user.image ?? ""} />
            <AvatarFallback>
              {session.user.name[0]?.toUpperCase() ?? "A"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
