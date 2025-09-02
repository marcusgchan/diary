import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "~/env.mjs";
import { db } from "~/server/db";

import { users, accounts, sessions, verifications } from "~/server/db/schema";
import { sendMail } from "../integrations/email";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: { users, accounts, sessions, verifications },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // autoSignIn: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      try {
        console.log("trying to send email");
        await sendMail({
          from: "mnemo.verify@gmail.com",
          to: user.email,
          subject: "Verify your email address",
          text: `Click the link to verify your email: ${url}`,
        });
      } catch (e) {
        console.log("failed to send email with this error", e);
      }
    },
  },
  socialProviders: {
    discord: {
      enabled: true,
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
  },
  user: {},
  plugins: [
    // emailOTP({
    //   async sendVerificationOTP({ email, otp, type }) {
    //     if (type === "sign-in") {
    //       // Send the OTP for sign in
    //     } else if (type === "email-verification") {
    //       // Send the OTP for email verification
    //     } else {
    //       // Send the OTP for password reset
    //     }
    //   },
    // }),
  ],
});

export type Session = typeof auth.$Infer.Session;
