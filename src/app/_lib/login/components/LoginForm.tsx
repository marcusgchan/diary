"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_lib/ui/card";
import { Button } from "~/app/_lib/ui/button";
import { Input } from "~/app/_lib/ui/input";
import { Label } from "~/app/_lib/ui/label";
import { cn } from "~/app/_lib/utils/cx";
import { authClient } from "../../utils/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, useAppForm } from "../../ui/form";
import z from "zod";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { ResendVerification } from "./ResendVerification";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Empty password field"),
});

type SubmitError = {
  title: string;
  description: React.ReactNode;
};

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isProviderLoading, setIsProviderLoading] = useState(false);
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: formSchema,
    },
    async onSubmit(data) {
      await authClient.signIn.email(
        {
          email: data.value.email,
          password: data.value.password,
        },
        {
          onSuccess() {
            router.push("/diaries");
          },
          onError(ctx) {
            if (ctx.error.status === 403) {
              data.formApi.setErrorMap({
                onSubmit: {
                  form: {
                    title: "Please verify your email",
                    description: (
                      <p>
                        A verification emails was sent when you signed up. If
                        you did not receive it click
                        <ResendVerification>
                          {({ active, timer, handleClick }) => (
                            <span className="inline-flex gap-1">
                              <button
                                onClick={async () =>
                                  await handleClick(async () => {
                                    await authClient.sendVerificationEmail({
                                      email: data.value.email,
                                    });
                                  })
                                }
                                disabled={active}
                                type="button"
                                className={cn(
                                  "underline",
                                  active && "cursor-not-allowed",
                                )}
                              >
                                here
                              </button>
                              {active && timer}
                            </span>
                          )}
                        </ResendVerification>
                        to resend
                      </p>
                    ),
                  } satisfies SubmitError,
                  fields: {},
                },
              });
            } else if (ctx.error.status === 401) {
              data.formApi.setErrorMap({
                onSubmit: {
                  form: {
                    title: "Username or password error",
                    description: (
                      <p>The username or password you entered is incorrect</p>
                    ),
                  } satisfies SubmitError,
                  fields: {},
                },
              });
            } else {
              data.formApi.setErrorMap({
                onSubmit: {
                  form: {
                    title: "Please verify your email",
                    description: (
                      <p>
                        A verification emails was sent when you signed up. If
                        you did not receive it click here to resend
                      </p>
                    ),
                  } satisfies SubmitError,
                  fields: {},
                },
              });
            }
          },
        },
      );
    },
  });
  return (
    <div
      className={cn("flex w-full max-w-sm flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await form.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-6">
              <form.AppField
                name="email"
                children={() => <TextField label="Email" />}
              />
              <form.AppField
                name="password"
                children={() => <TextField label="Password" />}
              />
              <Link
                href="/forgot-password"
                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
              <form.Subscribe
                selector={(state) => [state.errorMap]}
                children={([errorMap]) => {
                  const submitError = errorMap?.onSubmit as unknown as
                    | undefined
                    | SubmitError;
                  return (
                    submitError !== undefined && (
                      <div>
                        <Alert variant="destructive">
                          <AlertCircleIcon />
                          <AlertTitle>{submitError.title}</AlertTitle>
                          <AlertDescription>
                            {submitError.description}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )
                  );
                }}
              />
              <div className="flex flex-col gap-3">
                <form.Subscribe
                  selector={(state) => [state.isSubmitting]}
                  children={([isSubmitting]) => {
                    return (
                      <>
                        <Button
                          disabled={isProviderLoading || isSubmitting}
                          type="submit"
                          className="w-full"
                        >
                          Sign In
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          disabled={isProviderLoading}
                          onClick={async () => {
                            await authClient.signIn.social(
                              {
                                provider: "discord",
                                callbackURL: "/diaries",
                              },
                              {
                                onRequest() {
                                  setIsProviderLoading(true);
                                },
                                onResponse() {
                                  setIsProviderLoading(false);
                                },
                              },
                            );
                          }}
                        >
                          Login with Discord
                        </Button>
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
