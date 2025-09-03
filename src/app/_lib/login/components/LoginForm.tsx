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

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Empty password field"),
});

type SubmitError = {
  title: string;
  description: React.ReactNode;
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: formSchema,
    },
    async onSubmit(data) {
      console.log("valid");
      await authClient.signIn.email(
        {
          email: data.value.email,
          password: data.value.password,
        },
        {
          onError(ctx) {
            console.log({ ctx });
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
                                onClick={() => handleClick(data.value.email)}
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
    async onSubmitInvalid(data) {
      console.log("invalid", data);
      return "foooo";
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
              <a
                href="#"
                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </a>
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
                <Button type="submit" className="w-full">
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={async () => {
                    router.push("/diaries");
                  }}
                >
                  Login with Discord
                </Button>
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
