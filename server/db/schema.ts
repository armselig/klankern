/**
 * @fileoverview Database schema definition using Drizzle ORM.
 *
 * Defines all database tables, enums, indexes, and relations for the Klankern application.
 * Uses PostgreSQL with UUID v7 primary keys for better performance and sorting.
 *
 * @see {@link https://orm.drizzle.team/docs/overview} Drizzle ORM Documentation
 */

import { relations, sql } from "drizzle-orm";
import {
    boolean,
    index,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

// Enums
export const corkboardPostTypeEnum = pgEnum("corkboard_post_type", [
    "note",
    "photo",
]);

// Tables
export const roles = pgTable("roles", {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    name: text("name").notNull().unique(),
    description: text("description"),
});

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().default(sql`uuidv7()`),
        email: text("email").notNull().unique(),
        username: text("username").notNull().unique(),
        display_name: text("display_name"),
        password: text("password").notNull(),
        first_name: text("first_name"),
        last_name: text("last_name"),
        is_active: boolean("is_active").default(true),
        dashboardConfig: jsonb("dashboard_config"), // JSONB for dashboard preferences
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    },
    (table) => {
        return {
            emailIndex: index("users_email_idx").on(table.email),
            usernameIndex: index("users_username_idx").on(table.username),
            isActiveIndex: index("users_is_active_idx").on(table.is_active),
            createdAtIndex: index("users_created_at_idx").on(table.createdAt),
        };
    },
);

export const userRoles = pgTable(
    "user_roles",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.userId, table.roleId] }),
            userIdIndex: index("user_roles_user_id_idx").on(table.userId),
            roleIdIndex: index("user_roles_role_id_idx").on(table.roleId),
        };
    },
);

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().default(sql`uuidv7()`),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("sessions_user_id_idx").on(table.userId),
            tokenIndex: index("sessions_token_idx").on(table.token),
            expiresAtIndex: index("sessions_expires_at_idx").on(
                table.expiresAt,
            ),
        };
    },
);

export const corkboardPosts = pgTable(
    "corkboard_posts",
    {
        id: uuid("id").primaryKey().default(sql`uuidv7()`),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: corkboardPostTypeEnum("type").notNull(),
        data: jsonb("data"), // JSONB for content (note text or photo URL/caption)
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("corkboard_posts_user_id_idx").on(table.userId),
            typeIndex: index("corkboard_posts_type_idx").on(table.type),
            createdAtIndex: index("corkboard_posts_created_at_idx").on(
                table.createdAt,
            ),
        };
    },
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    userRoles: many(userRoles),
    sessions: many(sessions),
    corkboardPosts: many(corkboardPosts),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
    userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const corkboardPostsRelations = relations(corkboardPosts, ({ one }) => ({
    user: one(users, {
        fields: [corkboardPosts.userId],
        references: [users.id],
    }),
}));
