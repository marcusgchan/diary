import { env } from "./env.mjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && env.NODE_ENV === "production") {
    await import("./instrumentation.node");
  }
}
