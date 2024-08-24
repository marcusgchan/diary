import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  json,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";
import {
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const pgTable = pgTableCreator((name) => `${name}`);

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
  }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const diariesToUsers = pgTable(
  "diary_to_user",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id),
    diaryId: bigserial("diaryId", { mode: "number" })
      .notNull()
      .references(() => diaries.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.diaryId] }),
    };
  },
);

export const diaries = pgTable("diary", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const entries = pgTable("entry", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  diaryId: bigint("diaryId", { mode: "number" })
    .notNull()
    .references(() => diaries.id),
  day: date("day", { mode: "string" }).notNull(),
  title: text("title"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const imageKeys = pgTable("image_key", {
  key: text("key").primaryKey(),
  entryId: bigint("entryId", { mode: "number" })
    .references(() => entries.id)
    .notNull(),
  linked: boolean("linked").notNull().default(false),
  receivedWebhook: boolean("receivedWebhook").notNull().default(false),
  lon: doublePrecision("lon"),
  lat: doublePrecision("lat"),
  datetimeTaken: timestamp("datetimeTaken", { withTimezone: false }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const editorStates = pgTable("editor_state", {
  data: json("editorState").$type<
    SerializedEditorState<SerializedLexicalNode>
  >(),
  entryId: bigint("entryId", { mode: "number" })
    .primaryKey()
    .references(() => entries.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
