import { z } from "zod";

/**
 * Audit Log Types
 */

export const auditActionEnum = z.enum([
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "export",
    "anonymize",
]);

export type AuditAction = z.infer<typeof auditActionEnum>;

export const auditEntityTypeEnum = z.enum([
    "user",
    "family",
    "corkboard_post",
    "invitation",
    "session",
    "consent",
]);

export type AuditEntityType = z.infer<typeof auditEntityTypeEnum>;

export const auditLogSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid().nullable(),
    action: auditActionEnum,
    entity_type: auditEntityTypeEnum,
    entity_id: z.string().uuid(),
    old_values: z.record(z.string(), z.any()).nullable(),
    new_values: z.record(z.string(), z.any()).nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    created_at: z.date(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const createAuditLogSchema = z.object({
    user_id: z.string().uuid().optional(),
    action: auditActionEnum,
    entity_type: auditEntityTypeEnum,
    entity_id: z.string().uuid(),
    old_values: z.record(z.string(), z.any()).optional(),
    new_values: z.record(z.string(), z.any()).optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
});

export type CreateAuditLog = z.infer<typeof createAuditLogSchema>;

/**
 * User Consent Types (GDPR)
 */

export const consentTypeEnum = z.enum([
    "marketing",
    "analytics",
    "data_processing",
    "third_party_sharing",
]);

export type ConsentType = z.infer<typeof consentTypeEnum>;

export const userConsentSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    consent_type: consentTypeEnum,
    granted: z.boolean(),
    granted_at: z.date(),
    revoked_at: z.date().nullable(),
});

export type UserConsent = z.infer<typeof userConsentSchema>;

export const updateConsentSchema = z.object({
    consent_type: consentTypeEnum,
    granted: z.boolean(),
});

export type UpdateConsent = z.infer<typeof updateConsentSchema>;

export const consentPreferencesSchema = z.object({
    marketing: z.boolean(),
    analytics: z.boolean(),
    data_processing: z.boolean(),
    third_party_sharing: z.boolean(),
});

export type ConsentPreferences = z.infer<typeof consentPreferencesSchema>;

/**
 * Session Metadata Types
 */

export const sessionMetadataSchema = z.object({
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    last_activity_at: z.date().optional(),
    device_fingerprint: z.string().optional(),
});

export type SessionMetadata = z.infer<typeof sessionMetadataSchema>;

export const sessionWithMetadataSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    token: z.string(),
    expiresAt: z.date(),
    createdAt: z.date(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    last_activity_at: z.date().nullable(),
    device_fingerprint: z.string().nullable(),
});

export type SessionWithMetadata = z.infer<typeof sessionWithMetadataSchema>;

/**
 * Failed Login Types
 */

export const failedLoginSchema = z.object({
    failed_login_attempts: z.number().int().min(0),
    last_failed_login_at: z.date().nullable(),
    locked_until: z.date().nullable(),
});

export type FailedLoginInfo = z.infer<typeof failedLoginSchema>;

/**
 * User Data Export Types (GDPR)
 */

export const userDataExportSchema = z.object({
    personal_information: z.object({
        id: z.string().uuid(),
        email: z.string(),
        username: z.string(),
        display_name: z.string().nullable(),
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        is_active: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
        anonymized_at: z.date().nullable(),
    }),
    sessions: z.array(sessionWithMetadataSchema),
    posts: z.array(z.any()), // corkboard posts
    families: z.array(z.any()), // family memberships
    consents: z.array(userConsentSchema),
    export_date: z.string(),
});

export type UserDataExport = z.infer<typeof userDataExportSchema>;

/**
 * Anonymization Types
 */

export const anonymizationRequestSchema = z.object({
    reason: z.string().optional(),
    confirm: z.boolean().refine((val) => val === true, {
        message: "Must confirm anonymization request",
    }),
});

export type AnonymizationRequest = z.infer<typeof anonymizationRequestSchema>;

export const anonymizedUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string(),
    username: z.string(),
    display_name: z.string(),
    anonymized_at: z.date(),
});

export type AnonymizedUser = z.infer<typeof anonymizedUserSchema>;
