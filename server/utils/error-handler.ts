/**
 * @fileoverview Standardized error handling utilities for API routes.
 * Provides consistent error formatting and logging across all endpoints.
 */

import { createError } from "h3";
import { z } from "zod";
import { logger } from "./logger";

/**
 * Interface for database errors (PostgreSQL)
 */
interface DatabaseError {
    code: string;
    constraint?: string;
    detail?: string;
    table?: string;
}

/**
 * Type guard to check if an error is a database error
 */
function isDatabaseError(error: unknown): error is DatabaseError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as DatabaseError).code === "string"
    );
}

/**
 * Converts various error types to a standardized Error object
 */
function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    ) {
        return new Error((error as { message: string }).message);
    }

    return new Error("An unknown error occurred.");
}

/**
 * Enhanced error handler for API routes with consistent logging and error responses
 *
 * @param error - The caught error
 * @param context - Additional context for logging
 * @returns Never (always throws)
 *
 * @example
 * ```typescript
 * try {
 *   // API operation
 * } catch (error) {
 *   handleApiError(error, { operation: 'createUser', userId: '123' });
 * }
 * ```
 */
export function handleApiError(
    error: unknown,
    context?: Record<string, unknown>,
): never {
    const normalizedError = normalizeError(error);

    // Log the error with context
    logger.error("API Error:", {
        message: normalizedError.message,
        stack: normalizedError.stack,
        context,
    });

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: {
                issues: error.errors,
                context,
            },
        });
    }

    // Handle database constraint violations
    if (isDatabaseError(error)) {
        switch (error.code) {
            case "23505": // Unique constraint violation
                throw createError({
                    statusCode: 409,
                    statusMessage: "Resource already exists",
                    data: {
                        constraint: error.constraint,
                        detail: error.detail,
                        context,
                    },
                });
            case "23503": // Foreign key constraint violation
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid reference",
                    data: {
                        constraint: error.constraint,
                        detail: error.detail,
                        context,
                    },
                });
            case "23502": // Not null constraint violation
                throw createError({
                    statusCode: 400,
                    statusMessage: "Required field missing",
                    data: {
                        constraint: error.constraint,
                        detail: error.detail,
                        context,
                    },
                });
            default:
                // Log unknown database error codes for monitoring
                logger.warn("Unknown database error code:", {
                    code: error.code,
                    constraint: error.constraint,
                    detail: error.detail,
                    context,
                });
        }
    }

    // Generic server error
    throw createError({
        statusCode: 500,
        statusMessage: "An unexpected error occurred",
        data: {
            context,
        },
    });
}

/**
 * Validates request parameters using Zod schema
 *
 * @param params - Parameters to validate
 * @param schema - Zod schema for validation
 * @returns Parsed and validated parameters
 *
 * @example
 * ```typescript
 * const userIdSchema = z.string().uuid();
 * const userId = validateParams(event.context.params?.id, userIdSchema);
 * ```
 */
export function validateParams<T>(params: unknown, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(params);

    if (!result.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid parameters",
            data: {
                issues: result.error.errors,
            },
        });
    }

    return result.data;
}
