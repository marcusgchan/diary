import { TRPCProvider } from "~/trpc/TrpcProvider";
import { AuthGuard } from "@/app/_lib/auth/AuthGuard";
import { Toaster as Toaster_Old } from "@/app/_lib/ui/toaster";
import { Toaster } from "@/_lib/ui/sonner";
import { MapProvider } from "../_lib/map/providers/MapProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthGuard>
        <MapProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </MapProvider>
      </AuthGuard>
      <Toaster />
      <Toaster_Old />
    </>
  );
}
