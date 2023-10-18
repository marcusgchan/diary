import { Client } from "@planetscale/database";
//import { drizzle } from "drizzle-orm/planetscale-serverless";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "~/env.mjs";
import * as schema from "./schema";

/*export const db = drizzle(
  new Client({
    url: env.DATABASE_URL,
  }).connection(),
  { schema },
);*/

export const db = drizzle(
  await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "test123",
    database: "diary",
  }),
);
