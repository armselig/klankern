import {
    pgTable,
    uuid,
    text,
    timestamp,
    pgEnum,
    jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "parent", "child"]);
export const corkboardPostTypeEnum = pgEnum("corkboard_post_type", [
    "note",
    "photo",
]);

// Tables
export const roles = pgTable("roles", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuid_generate_v7()`),
    name: userRoleEnum("name").notNull().unique(),
    description: text("description"),
});

export const users = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuid_generate_v7()`),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id),
    dashboardConfig: jsonb("dashboard_config"), // JSONB for dashboard preferences
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuid_generate_v7()`),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const corkboardPosts = pgTable("corkboard_posts", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuid_generate_v7()`),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    type: corkboardPostTypeEnum("type").notNull(),
    data: jsonb("data"), // JSONB for content (note text or photo URL/caption)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
