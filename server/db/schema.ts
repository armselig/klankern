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
    integer,
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

export const auditActionEnum = pgEnum("audit_action", [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "export",
    "anonymize",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
    "user",
    "family",
    "corkboard_post",
    "invitation",
    "session",
    "consent",
]);

export const consentTypeEnum = pgEnum("consent_type", [
    "marketing",
    "analytics",
    "data_processing",
    "third_party_sharing",
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
        dashboard_config: jsonb("dashboard_config"), // JSONB for dashboard preferences
        // Failed login tracking fields
        // Note: Consider adding CHECK constraint: failed_login_attempts >= 0
        // Note: Consider adding CHECK constraint: locked_until > last_failed_login_at when both are set
        failed_login_attempts: integer("failed_login_attempts").default(0),
        last_failed_login_at: timestamp("last_failed_login_at"),
        locked_until: timestamp("locked_until"),
        // GDPR compliance field
        anonymized_at: timestamp("anonymized_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at")
            .notNull()
            .default(sql`now()`),
    },
    (table) => {
        return {
            emailIndex: index("users_email_idx").on(table.email),
            usernameIndex: index("users_username_idx").on(table.username),
            isActiveIndex: index("users_is_active_idx").on(table.is_active),
            createdAtIndex: index("users_created_at_idx").on(table.created_at),
        };
    },
);

export const userRoles = pgTable(
    "user_roles",
    {
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role_id: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.user_id, table.role_id] }),
            userIdIndex: index("user_roles_user_id_idx").on(table.user_id),
            roleIdIndex: index("user_roles_role_id_idx").on(table.role_id),
        };
    },
);

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        token: text("token").notNull().unique(),
        expires_at: timestamp("expires_at").notNull(),
        created_at: timestamp("created_at").notNull().defaultNow(),
        // Session metadata tracking fields
        ip_address: text("ip_address"),
        user_agent: text("user_agent"),
        last_activity_at: timestamp("last_activity_at"),
        device_fingerprint: text("device_fingerprint"),
    },
    (table) => {
        return {
            userIdIndex: index("sessions_user_id_idx").on(table.user_id),
            tokenIndex: index("sessions_token_idx").on(table.token),
            expiresAtIndex: index("sessions_expires_at_idx").on(
                table.expires_at,
            ),
        };
    },
);

export const corkboardPosts = pgTable(
    "corkboard_posts",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        family_id: uuid("family_id").references(() => families.id, {
            onDelete: "set null",
        }),
        type: corkboardPostTypeEnum("type").notNull(),
        data: jsonb("data"), // JSONB for content (note text or photo URL/caption)
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("corkboard_posts_user_id_idx").on(table.user_id),
            familyIdIndex: index("corkboard_posts_family_id_idx").on(
                table.family_id,
            ),
            typeIndex: index("corkboard_posts_type_idx").on(table.type),
            createdAtIndex: index("corkboard_posts_created_at_idx").on(
                table.created_at,
            ),
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
        };
    },
);

// Audit Log Table
export const auditLog = pgTable(
    "audit_log",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        action: auditActionEnum("action").notNull(),
        entity_type: auditEntityTypeEnum("entity_type").notNull(),
        entity_id: uuid("entity_id").notNull(),
        old_values: jsonb("old_values"),
        new_values: jsonb("new_values"),
        ip_address: text("ip_address"),
        user_agent: text("user_agent"),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("audit_log_user_id_idx").on(table.user_id),
            entityTypeIndex: index("audit_log_entity_type_idx").on(
                table.entity_type,
            ),
            entityIdIndex: index("audit_log_entity_id_idx").on(table.entity_id),
            createdAtIndex: index("audit_log_created_at_idx").on(
                table.created_at,
            ),
        };
    },
);

// User Consents Table (GDPR)
export const userConsents = pgTable(
    "user_consents",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        consent_type: consentTypeEnum("consent_type").notNull(),
        granted: boolean("granted").notNull(),
        granted_at: timestamp("granted_at").notNull().defaultNow(),
        revoked_at: timestamp("revoked_at"),
    },
    (table) => {
        return {
            userIdIndex: index("user_consents_user_id_idx").on(table.user_id),
            consentTypeIndex: index("user_consents_consent_type_idx").on(
                table.consent_type,
            ),
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
    auditLogs: many(auditLog),
    consents: many(userConsents),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
    userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    role: one(roles, {
        fields: [userRoles.role_id],
        references: [roles.id],
    }),
    user: one(users, {
        fields: [userRoles.user_id],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.user_id],
        references: [users.id],
    }),
}));

export const corkboardPostsRelations = relations(corkboardPosts, ({ one }) => ({
    user: one(users, {
        fields: [corkboardPosts.user_id],
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

export const auditLogRelations = relations(auditLog, ({ one }) => ({
    user: one(users, {
        fields: [auditLog.user_id],
        references: [users.id],
    }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
    user: one(users, {
        fields: [userConsents.user_id],
        references: [users.id],
    }),
}));
