import { defineConfig } from "drizzle-kit";
import { env } from "./src/env.mjs";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/server/db/schema.ts",
  dbCredentials: {
    host: "localhost",
    port: env.DATABSE_PORT,
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASS,
  },
  verbose: true,
  tablesFilter: ["diary_*"],
});
