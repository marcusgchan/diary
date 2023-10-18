import { type Config } from "drizzle-kit";
import { env } from "./src/env.mjs";

export default {
  schema: "./src/server/db/schema.ts",
  driver: "mysql2",
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
  verbose: true,
  //tablesFilter: ["p1_*"],
} satisfies Config;
