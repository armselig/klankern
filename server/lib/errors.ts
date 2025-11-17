/**
 * @fileoverview Domain error classes for the service layer.
 *
 * Services throw domain-specific errors that describe business logic failures.
 * Route handlers catch these errors and translate them to appropriate HTTP responses.
 *
 * This separation allows:
 * - Business logic to be independent of HTTP layer
 * - Consistent error handling across different transport layers (HTTP, GraphQL, etc.)
 * - Clear semantics for error conditions in tests
 */

import { createError } from "h3";
import { logger } from "#server/utils/logger";

/**
 * Base class for all domain errors.
 * Extend this for specific error types.
 */
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Thrown when a requested resource is not found.
 *
 * @example
 * ```typescript
 * const family = await db.query.families.findFirst({
 *   where: eq(families.id, familyId)
 * });
 * if (!family) {
 *   throw new NotFoundError("Family not found");
 * }
 * ```
 *
 * Maps to HTTP 404 Not Found
 */
export class NotFoundError extends DomainError {
    constructor(message = "Resource not found") {
        super(message);
    }
}

/**
 * Thrown when a user is not authenticated.
 *
 * @example
 * ```typescript
 * if (!userId) {
 *   throw new UnauthorizedError("Authentication required");
 * }
 * ```
 *
 * Maps to HTTP 401 Unauthorized
 */
export class UnauthorizedError extends DomainError {
    constructor(message = "Authentication required") {
        super(message);
    }
}

/**
 * Thrown when a user lacks permission to perform an action.
 *
 * @example
 * ```typescript
 * const member = await db.query.familyMembers.findFirst({
 *   where: and(
 *     eq(familyMembers.family_id, familyId),
 *     eq(familyMembers.user_id, userId)
 *   )
 * });
 * if (!member || member.role !== "manager") {
 *   throw new ForbiddenError("Only family managers can perform this action");
 * }
 * ```
 *
 * Maps to HTTP 403 Forbidden
 */
export class ForbiddenError extends DomainError {
    constructor(message = "Permission denied") {
        super(message);
    }
}

/**
 * Thrown when input data fails validation.
 *
 * @example
 * ```typescript
 * if (!data.name || data.name.trim().length === 0) {
 *   throw new ValidationError("Family name is required");
 * }
 * ```
 *
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends DomainError {
    public readonly issues?: unknown[];

    constructor(message = "Validation failed", issues?: unknown[]) {
        super(message);
        this.issues = issues;
    }
}

/**
 * Thrown when a business rule is violated.
 *
 * @example
 * ```typescript
 * const existingFamily = await db.query.families.findFirst({
 *   where: eq(families.name, data.name)
 * });
 * if (existingFamily) {
 *   throw new ConflictError("A family with this name already exists");
 * }
 * ```
 *
 * Maps to HTTP 409 Conflict
 */
export class ConflictError extends DomainError {
    constructor(message = "Resource conflict") {
        super(message);
    }
}

/**
 * Thrown for unexpected internal errors.
 * Use sparingly - prefer specific error types when possible.
 *
 * @example
 * ```typescript
 * if (!insertedFamily) {
 *   throw new InternalError("Family creation failed during insert");
 * }
 * ```
 *
 * Maps to HTTP 500 Internal Server Error
 */
export class InternalError extends DomainError {
    constructor(message = "Internal error occurred") {
        super(message);
    }
}

/**
 * Translates domain errors to HTTP errors for route handlers.
 *
 * SECURITY NOTE: Domain errors are DESIGNED to expose their messages to users.
 * These messages are part of the API contract and are safe to show.
 *
 * System/unexpected errors are logged but return generic messages to prevent
 * information leakage.
 */
export function translateError(error: unknown) {
    // Domain errors: Safe to expose (designed for user consumption)
    if (error instanceof UnauthorizedError) {
        return createError({
            statusCode: 401,
            statusMessage: error.message,
        });
    }

    if (error instanceof ForbiddenError) {
        return createError({
            statusCode: 403,
            statusMessage: error.message,
        });
    }

    if (error instanceof NotFoundError) {
        return createError({
            statusCode: 404,
            statusMessage: error.message,
        });
    }

    if (error instanceof ValidationError) {
        return createError({
            statusCode: 400,
            statusMessage: error.message,
            data: error.issues,
        });
    }

    if (error instanceof ConflictError) {
        return createError({
            statusCode: 409,
            statusMessage: error.message,
        });
    }

    if (error instanceof InternalError) {
        // Log but don't expose implementation details
        logger.error("Internal service error:", {
            message: error.message,
            stack: error.stack,
        });
        return createError({
            statusCode: 500,
            statusMessage: "An internal error occurred.",
        });
    }

    // System/unexpected errors: Log but don't expose details
    logger.error("Unexpected service error:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error,
    });

    return createError({
        statusCode: 500,
        statusMessage: "An unexpected error occurred.",
    });
}
