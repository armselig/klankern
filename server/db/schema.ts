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
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()`),
    name: text("name").notNull().unique(),
    description: text("description"),
});

export const users = pgTable(
    "users",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        email: text("email").notNull().unique(),
        username: text("username").notNull().unique(),
        display_name: text("display_name"),
        password: text("password").notNull(),
        first_name: text("first_name"),
        last_name: text("last_name"),
        is_active: boolean("is_active").default(true),
        dashboardConfig: jsonb("dashboard_config"), // JSONB for dashboard preferences
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .default(sql`now()`),
    },
    (table) => {
        return {
            emailIndex: index("users_email_idx").on(table.email),
            usernameIndex: index("users_username_idx").on(table.username),
            isActiveIndex: index("users_is_active_idx").on(table.is_active),
            createdAtIndex: index("users_created_at_idx").on(table.createdAt),
            // GIN index for JSONB dashboard_config field
            dashboardConfigGinIndex: index("users_dashboard_config_gin_idx")
                .using("gin", table.dashboardConfig)
                .concurrently(),
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
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
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
            // Composite index for active sessions per user
            userActiveSessionsIndex: index("sessions_user_active_idx")
                .on(table.userId, table.expiresAt)
                .concurrently(),
            // Partial index for active sessions only
            activeSessionsIndex: index("sessions_active_idx")
                .on(table.expiresAt)
                .where(sql`${table.expiresAt} > now()`)
                .concurrently(),
        };
    },
);

export const corkboardPosts = pgTable(
    "corkboard_posts",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        family_id: uuid("family_id").references(() => families.id, {
            onDelete: "set null",
        }),
        type: corkboardPostTypeEnum("type").notNull(),
        data: jsonb("data"), // JSONB for content (note text or photo URL/caption)
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("corkboard_posts_user_id_idx").on(table.userId),
            familyIdIndex: index("corkboard_posts_family_id_idx").on(
                table.family_id,
            ),
            typeIndex: index("corkboard_posts_type_idx").on(table.type),
            createdAtIndex: index("corkboard_posts_created_at_idx").on(
                table.createdAt,
            ),
            // Composite index for family timeline queries
            // Note: PostgreSQL can scan indexes backward efficiently, so explicit DESC
            // ordering is not required. Queries with ORDER BY created_at DESC will
            // still benefit from this index.
            familyTimelineIndex: index("corkboard_posts_family_timeline_idx")
                .on(table.family_id, table.createdAt)
                .concurrently(),
            // GIN index for JSONB data field
            dataGinIndex: index("corkboard_posts_data_gin_idx")
                .using("gin", table.data)
                .concurrently(),
        };
    },
);

export const families = pgTable(
    "families",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        name: text("name").notNull(),
        creator_id: uuid("creator_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at")
            .notNull()
            .default(sql`now()`),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => {
        return {
            creatorIdIndex: index("families_creator_id_idx").on(
                table.creator_id,
            ),
            deletedAtIndex: index("families_deleted_at_idx").on(
                table.deleted_at,
            ),
            // Partial index for active families only
            activeFamiliesIndex: index("families_active_idx")
                .on(table.created_at)
                .where(sql`${table.deleted_at} IS NULL`)
                .concurrently(),
        };
    },
);

export const familyMembers = pgTable(
    "family_members",
    {
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: text("role").notNull(), // e.g., 'manager', 'member'
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.family_id, table.user_id] }),
            userIdIndex: index("family_members_user_id_idx").on(table.user_id),
        };
    },
);

export const familyInvitations = pgTable(
    "family_invitations",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        invited_by_user_id: uuid("invited_by_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        invited_email: text("invited_email").notNull(),
        token: text("token").notNull().unique(),
        status: text("status").notNull().default("pending"), // e.g., 'pending', 'accepted', 'declined'
        expires_at: timestamp("expires_at").notNull(),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at")
            .notNull()
            .default(sql`now()`),
    },
    (table) => {
        return {
            familyIdIndex: index("family_invitations_family_id_idx").on(
                table.family_id,
            ),
            invitedEmailIndex: index("family_invitations_invited_email_idx").on(
                table.invited_email,
            ),
            // Composite index for pending family invitations
            familyStatusIndex: index("family_invitations_family_status_idx")
                .on(table.family_id, table.status)
                .concurrently(),
            // Partial index for pending invitations only
            pendingInvitationsIndex: index("family_invitations_pending_idx")
                .on(table.family_id, table.invited_email)
                .where(sql`${table.status} = 'pending'`)
                .concurrently(),
        };
    },
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    userRoles: many(userRoles),
    sessions: many(sessions),
    corkboardPosts: many(corkboardPosts),
    familyMembers: many(familyMembers),
    createdFamilies: many(families, { relationName: "creator" }),
    sentFamilyInvitations: many(familyInvitations, {
        relationName: "inviter",
    }),
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
    family: one(families, {
        fields: [corkboardPosts.family_id],
        references: [families.id],
    }),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
    creator: one(users, {
        fields: [families.creator_id],
        references: [users.id],
        relationName: "creator",
    }),
    members: many(familyMembers),
    invitations: many(familyInvitations),
    corkboardPosts: many(corkboardPosts),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
    family: one(families, {
        fields: [familyMembers.family_id],
        references: [families.id],
    }),
    user: one(users, {
        fields: [familyMembers.user_id],
        references: [users.id],
    }),
}));

export const familyInvitationsRelations = relations(
    familyInvitations,
    ({ one }) => ({
        family: one(families, {
            fields: [familyInvitations.family_id],
            references: [families.id],
        }),
        invitedByUser: one(users, {
            fields: [familyInvitations.invited_by_user_id],
            references: [users.id],
            relationName: "inviter",
        }),
    }),
);
