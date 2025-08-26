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

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const pgTable = pgTableCreator((name) => `${name}`);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Users = typeof users.$inferSelect;

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const diariesToUsers = pgTable(
  "diaries_to_users",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    diaryId: bigserial("diary_id", { mode: "number" })
      .notNull()
      .references(() => diaries.id),
  },
  (table) => {
    return [primaryKey({ columns: [table.userId, table.diaryId] })];
  },
);

export const diaries = pgTable("diaries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  deleting: boolean("deleting").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type Diaries = typeof diaries.$inferSelect;

export const entries = pgTable("entries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  diaryId: bigint("diary_id", { mode: "number" })
    .notNull()
    .references(() => diaries.id),
  day: date("day", { mode: "string" }).notNull(),
  title: text("title").notNull().default(""),
  deleting: boolean("deleting").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Entries = typeof entries.$inferSelect;

export const imageKeys = pgTable("image_keys", {
  key: text("key").primaryKey(),

  // name, mimetype, size are for populating edit form image field
  name: text("name").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => users.id),

  compressionStatus: text("compression_status")
    .default("success")
    .$type<"success" | "failure">()
    .notNull(),
  deleting: boolean("deleting").notNull().default(false),
  takenAt: timestamp("taken_at").notNull().defaultNow(),
  uploadAt: timestamp("created_at").notNull().defaultNow(),
});

export type ImageKeys = typeof imageKeys.$inferSelect;

export const geoData = pgTable("geo_data", {
  key: text("key")
    .references(() => imageKeys.key)
    .primaryKey(),
  lon: doublePrecision("lon").notNull(),
  lat: doublePrecision("lat").notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: bigint("entry_id", { mode: "number" })
    .notNull()
    .references(() => entries.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 2048 }).notNull(),
  order: integer("order").notNull(),
  deleting: boolean("deleting").notNull().default(false),
});
export type Posts = typeof posts.$inferSelect;

export const postImages = pgTable("post_images", {
  id: uuid("id").primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id),
  imageKey: text("image_key")
    .notNull()
    .references(() => imageKeys.key),
  order: integer("order").notNull(),
});

export const editorStates = pgTable("editor_states", {
  data: json("editor_state").$type<
    SerializedEditorState<SerializedLexicalNode>
  >(),
  entryId: bigint("entry_id", { mode: "number" })
    .primaryKey()
    .references(() => entries.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type EditorStates = typeof editorStates.$inferSelect;
