import { relations, sql } from "drizzle-orm";
import {
    boolean,
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

export const users = pgTable("users", {
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
});

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
        };
    },
);

export const sessions = pgTable("sessions", {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const corkboardPosts = pgTable("corkboard_posts", {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: corkboardPostTypeEnum("type").notNull(),
    data: jsonb("data"), // JSONB for content (note text or photo URL/caption)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
