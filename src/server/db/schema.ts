import { relations, sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  index,
  int,
  json,
  mysqlTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
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
export const mysqlTable = mysqlTableCreator((name) => `diary_${name}`);

export const users = mysqlTable("user", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  e: varchar("e", { length: 255 }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
    fsp: 3,
  }).default(sql`CURRENT_TIMESTAMP(3)`),
  image: varchar("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("userId_idx").on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = mysqlTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("userId_idx").on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = mysqlTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const diariesToUsers = mysqlTable(
  "diary_to_user",
  {
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    diaryId: bigint("diaryId", { mode: "number" })
      .notNull()
      .references(() => diaries.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.diaryId] }),
    };
  },
);

export const diaries = mysqlTable("diary", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: datetime("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const entries = mysqlTable("entry", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  diaryId: bigint("diaryId", { mode: "number" })
    .notNull()
    .references(() => diaries.id),
  day: date("day", { mode: "string" }).notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: datetime("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const editorStates = mysqlTable("editor_state", {
  data: json("editorState").$type<
    SerializedEditorState<SerializedLexicalNode>
  >(),
  entryId: bigint("entryId", { mode: "number" })
    .primaryKey()
    .references(() => entries.id),
  createdAt: datetime("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
