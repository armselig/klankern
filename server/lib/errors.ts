import { createError } from "h3";
import { logger } from "#server/utils/logger";

/**
 * Base class for domain errors
 */
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class UnauthorizedError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ValidationError extends DomainError {}
export class ConflictError extends DomainError {}

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
        });
    }

    if (error instanceof ConflictError) {
        return createError({
            statusCode: 409,
            statusMessage: error.message,
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
