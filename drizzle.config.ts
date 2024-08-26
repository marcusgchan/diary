import { defineConfig } from "drizzle-kit";
import { env } from "./src/env.mjs";

export default defineConfig({
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  dbCredentials: {
    // url: `postgres://${env.DATABASE_USER}:${env.DATABASE_PASS}@${env.DATABASE_HOST}:${env.DATABASE_PORT}/${env.DATABASE_NAME}`,
    url: `postgres://${env.DATABASE_USER}:${env.DATABASE_PASS}@localhost:${env.DATABASE_PORT}/${env.DATABASE_NAME}`,
  },
  verbose: true,
});
