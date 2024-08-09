import { defineConfig } from "drizzle-kit";
import { env } from "./src/env.mjs";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/server/db/schema.ts",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  tablesFilter: ["diary_*"],
});
