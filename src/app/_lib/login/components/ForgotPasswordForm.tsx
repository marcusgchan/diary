"use client";

import z from "zod";
import { authClient } from "../../utils/auth-client";
import { TextField, useAppForm } from "../../ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResendVerification } from "./ResendVerification";
import { useRef } from "react";

const formSchema = z.object({
  email: z.string().email(),
});

type SubmitError = {
  title: string;
  description: string;
};

type SubmitMeta = {
  sendVerificationEmail:
    | ((callback?: () => Promise<void> | void) => Promise<void>)
    | null;
};

const defaultMeta: SubmitMeta = { sendVerificationEmail: null };

export function ForgotPasswordForm() {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const form = useAppForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onBlur: formSchema,
    },
    onSubmitMeta: defaultMeta,
    async onSubmit({ value, meta }) {
      const { email } = value;
      await authClient.forgetPassword(
        {
          email,
          redirectTo: `/reset-password?email=${email}`,
        },
        {
          onError() {
            form.setErrorMap({
              onSubmit: {
                form: {
                  title: "Error",
                  description:
                    "There was an error while tring to reset password",
                } satisfies SubmitError,
                fields: {},
              },
            });
          },
          async onSuccess() {
            await meta.sendVerificationEmail!();
          },
        },
      );
    },
  });
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          A password reset link will be sent to the email you enter below. Once
          you reset your password using the link, you can sign in using your new
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            buttonRef.current?.click();
          }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="grid gap-2">
            <form.AppField
              name="email"
              children={() => <TextField label="Email" />}
            />
            <form.Subscribe
              selector={(state) => [state.errorMap]}
              children={([errorMap]) => {
                const submitError = errorMap?.onSubmit as unknown as
                  | undefined
                  | SubmitError;
                return (
                  submitError !== undefined && (
                    <Alert variant="destructive">
                      <AlertCircleIcon />
                      <AlertTitle>{submitError.title}</AlertTitle>
                      <AlertDescription>
                        {submitError.description}
                      </AlertDescription>
                    </Alert>
                  )
                );
              }}
            />
          </div>
          <form.AppForm>
            <div className="flex justify-end gap-2">
              <form.Button
                type="button"
                onClick={() => router.back()}
                variant="ghost"
              >
                Back
              </form.Button>
              <form.Subscribe
                selector={(state) => [state.isSubmitting]}
                children={([isSubmitting]) => {
                  return (
                    <ResendVerification>
                      {({ timer, active, handleClick }) => {
                        return (
                          <form.Button
                            ref={buttonRef}
                            disabled={active || isSubmitting}
                            type="button"
                            onClick={async () => {
                              await form.handleSubmit({
                                sendVerificationEmail: handleClick,
                              });
                            }}
                          >
                            Reset Password {active && timer}
                          </form.Button>
                        );
                      }}
                    </ResendVerification>
                  );
                }}
              />
            </div>
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
