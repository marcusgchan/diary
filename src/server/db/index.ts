import { drizzle } from "drizzle-orm/postgres-js";
import postgress from "postgres";
import { env } from "~/env.mjs";

const connection = env.DATABASE_URL;

const client = postgress(connection, { prepare: false });

export const db = drizzle(client);
