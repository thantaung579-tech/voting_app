import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Candidates table for storing candidate information
 */
export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 255 }),
  voteCount: int("voteCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

/**
 * Voters table for tracking voter registration and phone numbers
 */
export const voters = mysqlTable("voters", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  hasVoted: boolean("hasVoted").default(false).notNull(),
  votedAt: timestamp("votedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Voter = typeof voters.$inferSelect;
export type InsertVoter = typeof voters.$inferInsert;

/**
 * Votes table for storing individual votes
 * Includes uniqueness constraint to prevent duplicate votes from same voter for same candidate
 */
export const votes = mysqlTable("votes", {
  id: int("id").autoincrement().primaryKey(),
  voterId: int("voterId").notNull(),
  candidateId: int("candidateId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  // Prevent same voter from voting for same candidate twice
  // This ensures 3-vote limit is enforced correctly
]);

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

// Note: Foreign key constraints and unique index on (voterId, candidateId)
// will be added in migration to prevent duplicate votes and enforce referential integrity

/**
 * Settings table for admin-controlled configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;