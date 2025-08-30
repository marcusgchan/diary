"use client";

import { TextField, useAppForm } from "@/_lib/ui/form";
import z from "zod";

const formSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name must be at least 1 character long"),
    lastName: z.string().min(1, "Last name must be at least 1 character long"),
    email: z.string().email("Invalid email"),
    password: z.string(),
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

export function SignUpForm() {
  const form = useAppForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      reenterPassword: "",
    },
    validators: {
      onBlur: formSchema,
    },
    onSubmit(props) {
      console.log("valid", props);
    },
    onSubmitInvalid(props) {
      console.log("invalid", props);
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
      className="grid w-full max-w-sm gap-2 p-4"
    >
      <div className="grid grid-cols-2 items-start gap-4">
        <form.AppField
          name="firstName"
          children={() => <TextField label="First Name" />}
        />
        <form.AppField
          name="lastName"
          children={() => <TextField label="Last Name" />}
        />
      </div>
      <form.AppField
        name="email"
        children={() => <TextField label="Email" />}
      />
      <form.AppField
        name="password"
        children={() => <TextField label="Password" />}
      />
      <form.AppField
        name="reenterPassword"
        children={() => <TextField label="Re-enter Password" />}
      />
      <form.Subscribe
        selector={(state) => [
          state.fieldMeta.password.isBlurred,
          state.values.password,

          state.fieldMeta.reenterPassword.isBlurred,
          state.values.reenterPassword,
        ]}
        children={([
          isPasswordBlurred,
          password,
          isReenterPasswordBlurred,
          reenterPassword,
        ]) => {
          return (
            isPasswordBlurred &&
            isReenterPasswordBlurred &&
            password !== reenterPassword && <p>Passwords do not match!</p>
          );
        }}
      />
      <form.AppForm>
        <form.Button>Create Account</form.Button>
      </form.AppForm>
    </form>
  );
}
