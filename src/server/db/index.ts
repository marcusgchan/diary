import { drizzle } from "drizzle-orm/postgres-js";
import postgress from "postgres";
import { env } from "~/env.mjs";
import * as schema from "./schema";

const connection = env.DATABASE_URL;

const client = postgress(connection);

export const db = drizzle(client);
