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
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/_lib/ui/dialog";
import { ResendVerification } from "./ResendVerification";
import { cn } from "../../utils/cx";
import { useState } from "react";
import { Button } from "@/_lib/ui/button";

const formSchema = z
  .object({
    name: z.string().min(1, "Invalid name"),
    email: z.string().email("Invalid email"),
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
    confirmPassword: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
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

export function SignUpForm() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onBlur: formSchema,
    },
    async onSubmit(props) {
      const { name, email, password } = props.value;
      await authClient.signUp.email(
        {
          name,
          email,
          password,
          callbackURL: "/verified",
        },
        {
          onError(ctx) {
            if (ctx.error.status === 422) {
              form.setErrorMap({
                onSubmit: {
                  form: {
                    title: "Error",
                    description: ctx.error.message,
                  } satisfies SubmitError,
                  fields: {},
                },
              });
            } else {
              form.setErrorMap({
                onSubmit: {
                  form: {
                    title: "Error",
                    description:
                      "There was an error while creating an account.",
                  } satisfies SubmitError,
                  fields: {},
                },
              });
            }
          },
          onSuccess() {
            setIsModalOpen(true);
          },
        },
      );
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign Up to Create Your Account</CardTitle>
        <CardDescription>
          Enter your details below to create an account.
        </CardDescription>
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
              name="name"
              children={() => <TextField label="First Name" />}
            />
            <form.AppField
              name="email"
              children={() => <TextField type="email" label="Email" />}
            />
            <form.AppField
              name="password"
              children={() => <TextField type="password" label="Password" />}
            />
            <form.AppField
              name="confirmPassword"
              children={() => (
                <TextField type="password" label="Confirm Password" />
              )}
            />
            <form.Subscribe
              selector={(state) => {
                return [
                  state.fieldMeta.password?.isBlurred,
                  state.fieldMeta.password?.isValid,
                  state.values.password,

                  state.fieldMeta.confirmPassword?.isBlurred,
                  state.values.confirmPassword,
                  state.submissionAttempts,
                ];
              }}
              children={([
                isPasswordBlurred,
                isPasswordValid,
                password,
                isConfirmPasswordBlurred,
                confirmPassword,
                submissionAttempts,
              ]) => {
                if (
                  isPasswordValid &&
                  isPasswordBlurred &&
                  (isConfirmPasswordBlurred ||
                    (submissionAttempts as number) > 0) &&
                  password !== confirmPassword
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

            <form.Subscribe
              selector={(state) => [state.values.email]}
              children={([email]) => {
                return (
                  <Dialog open={isModalOpen}>
                    <DialogContent showCloseButton={false}>
                      <DialogHeader>
                        <DialogTitle>Verify your email</DialogTitle>
                        <DialogDescription>
                          A verification link has been sent to your email.
                          Please open it to complete your sign-up. If you did
                          not receive it, check your spam folder.
                        </DialogDescription>
                        <ResendVerification>
                          {({ active, timer, handleClick }) => (
                            <span className="">
                              Click{" "}
                              <button
                                onClick={async () =>
                                  await handleClick(async () => {
                                    await authClient.sendVerificationEmail({
                                      email: email!,
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
                              </button>{" "}
                              {active && timer + " "}
                              to resend verification like to your email if you
                              did not receive it. Once you have verified your
                              email, you can click the sign in button.
                            </span>
                          )}
                        </ResendVerification>
                      </DialogHeader>
                      <Button
                        type="button"
                        onClick={() => router.push("/diaries")}
                      >
                        Sign In
                      </Button>
                    </DialogContent>
                  </Dialog>
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
                    Create Account
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
