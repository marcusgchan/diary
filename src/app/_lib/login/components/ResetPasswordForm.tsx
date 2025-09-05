"use client";

import { TextField, useAppForm } from "@/_lib/ui/form";
import z from "zod";
import { authClient } from "../../utils/auth-client";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { AlertCircleIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/_lib/ui/button";

const formSchema = z
  .object({
    password: z.string().refine(
      (password) => {
        if (password.length < 8) {
          return false;
        }

        if (!/[A-Z]/.test(password)) {
          return false;
        }

        const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`€£¥¢±∞≠≤≥]/;
        if (!specialChars.test(password)) {
          return false;
        }

        return true;
      },
      {
        message:
          "Password must be at least 8 characters long, contain at least one capital letter, and contain at least one special symbol",
      },
    ),
    reenterPassword: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.reenterPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
      });
      return false;
    }
    return true;
  });

type SubmitError = {
  title: string;
  description: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const searchQuery = useSearchParams();
  const token = searchQuery.get("token");
  const email = searchQuery.get("email");

  const form = useAppForm({
    defaultValues: {
      password: "",
      reenterPassword: "",
    },
    validators: {
      onBlur: formSchema,
    },
    async onSubmit(props) {
      const { password } = props.value;
      await authClient.resetPassword(
        {
          token: token!,
          newPassword: password,
        },
        {
          onError() {
            form.setErrorMap({
              onSubmit: {
                form: {
                  title: "Error",
                  description:
                    "There was an error while resetting your password.",
                } satisfies SubmitError,
                fields: {},
              },
            });
          },
          onSuccess() {
            router.push("/reset-password/successful");
          },
        },
      );
    },
  });

  if (!token || !email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            There was a problem trying to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Button type="button" onClick={() => router.push("/sign-in")}>
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>Enter your new pasword below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await form.handleSubmit();
          }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="grid gap-2">
            <form.AppField
              name="password"
              children={() => <TextField label="Password" />}
            />
            <form.AppField
              name="reenterPassword"
              children={() => <TextField label="Re-enter Password" />}
            />
            <form.Subscribe
              selector={(state) => {
                return [
                  state.fieldMeta.password?.isBlurred,
                  state.fieldMeta.password?.isValid,
                  state.values.password,

                  state.fieldMeta.reenterPassword?.isBlurred,
                  state.values.reenterPassword,
                  state.submissionAttempts,
                ];
              }}
              children={([
                isPasswordBlurred,
                isPasswordValid,
                password,
                isReenterPasswordBlurred,
                reenterPassword,
                submissionAttempts,
              ]) => {
                if (
                  isPasswordValid &&
                  isPasswordBlurred &&
                  (isReenterPasswordBlurred ||
                    (submissionAttempts as number) > 0) &&
                  password !== reenterPassword
                ) {
                  return (
                    <p className="text-red-400">Passwords do not match!</p>
                  );
                }

                return null;
              }}
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
            <form.Subscribe
              selector={(state) => [state.isSubmitting]}
              children={([isSubmitting]) => {
                return (
                  <form.Button disabled={isSubmitting} className="w-full">
                    Create new password
                  </form.Button>
                );
              }}
            />
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
