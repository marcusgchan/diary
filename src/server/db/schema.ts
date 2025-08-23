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
  varchar,
  uuid,
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
}).enableRLS();

export type Users = typeof users.$inferSelect;

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
).enableRLS();

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}).enableRLS();

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
).enableRLS();

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
).enableRLS();

export const diaries = pgTable("diary", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  deleting: boolean("deleting").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}).enableRLS();
export type Diaries = typeof diaries.$inferSelect;

export const entries = pgTable("entry", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  diaryId: bigint("diaryId", { mode: "number" })
    .notNull()
    .references(() => diaries.id),
  day: date("day", { mode: "string" }).notNull(),
  title: text("title").notNull().default(""),
  deleting: boolean("deleting").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}).enableRLS();

export type Entries = typeof entries.$inferSelect;

export const imageKeys = pgTable("image_keys", {
  key: text("key").primaryKey(),

  // name, mimetype, size are for populating edit form image field
  name: text().notNull(),
  mimetype: text().notNull(),
  size: integer().notNull(),

  userId: text("userId")
    .notNull()
    .references(() => users.id),

  compressionStatus: text("compressionStatus")
    .default("success")
    .$type<"success" | "failure">()
    .notNull(),
  deleting: boolean().notNull().default(false),
  takenAt: timestamp("takenAt").notNull().defaultNow(),
  uploadAt: timestamp("createdAt").notNull().defaultNow(),
}).enableRLS();

export type ImageKeys = typeof imageKeys.$inferSelect;

export const geoData = pgTable("geo_data", {
  key: text()
    .references(() => imageKeys.key)
    .primaryKey(),
  lon: doublePrecision("lon").notNull(),
  lat: doublePrecision("lat").notNull(),
});

export const posts = pgTable("posts", {
  id: uuid().primaryKey().defaultRandom(),
  entryId: bigint({ mode: "number" })
    .notNull()
    .references(() => entries.id),
  title: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 2048 }).notNull(),
  order: integer().notNull(),
  deleting: boolean("deleting").notNull().default(false),
}).enableRLS();
export type Posts = typeof posts.$inferSelect;

export const postImages = pgTable("post_images", {
  id: uuid().primaryKey(),
  postId: uuid()
    .notNull()
    .references(() => posts.id),
  imageKey: text("key")
    .notNull()
    .references(() => imageKeys.key),
  order: integer().notNull(),
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
}).enableRLS();
export type EditorStates = typeof editorStates.$inferSelect;
