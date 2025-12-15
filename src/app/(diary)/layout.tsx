import { TRPCProvider } from "~/trpc/TrpcProvider";
import { AuthGuard } from "@/app/_lib/auth/AuthGuard";
import { Toaster as Toaster_Old } from "@/app/_lib/ui/toaster";
import { Toaster } from "@/_lib/ui/sonner";
import { InitMapLibre } from "@/app/_lib/map/components/InitMapLibre";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InitMapLibre />
      <AuthGuard>
        <TRPCProvider>{children}</TRPCProvider>
      </AuthGuard>
      <Toaster />
      <Toaster_Old />
    </>
  );
}
