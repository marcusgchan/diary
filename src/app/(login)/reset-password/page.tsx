import { Suspense } from "react";
import { ResetPasswordForm } from "~/app/_lib/login/components/ResetPasswordForm";

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
