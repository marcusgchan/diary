import nodemailer from "nodemailer";
import { env } from "~/env.mjs";

export function createTransporter() {
  const username = env.GOOGLE_EMAIL_USERNAME;
  const password = env.GOOGLE_EMAIL_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    ignoreTLS: false,
    auth: {
      user: username,
      pass: password,
    },
  });
  return transporter;
}

type SendMailProps = {
  to: string;
  from: string;
  subject: string;
  text: string;
};
export async function sendMail({ to, from, subject, text }: SendMailProps) {
  const transporter = createTransporter();
  await transporter.sendMail({
    subject,
    from,
    to,
    text,
  });
}
