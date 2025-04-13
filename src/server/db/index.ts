import { drizzle } from "drizzle-orm/postgres-js";
import postgress from "postgres";
import { env } from "~/env.mjs";

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof drizzle> | undefined;
}

const connection = env.DATABASE_URL;

const client = postgress(connection, { prepare: false });

const db = globalThis._db ?? drizzle(client);

if (process.env.NODE_ENV !== "production") {
  globalThis._db = db;
}

export { db };
