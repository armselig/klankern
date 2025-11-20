import { ForbiddenError, NotFoundError, ValidationError } from "./errors";

/**
 * Helper to find a resource or throw appropriate errors.
 * Throws ValidationError if the lookup fails due to invalid UUID format (Postgres 22P02).
 * Throws NotFoundError if the resource is not found.
 * Optionally throws a custom error type instead of NotFoundError if customNotFoundErrorType is provided.
 */
export async function findResourceOrThrow<T>(
    findFn: () => Promise<T | undefined>,
    resourceName: string,
    customNotFoundErrorType?: "ForbiddenError",
): Promise<T> {
    let resource;
    try {
        resource = await findFn();
    } catch (error: unknown) {
        // Postgres error code for invalid text representation (e.g. invalid UUID)
        const pgError = error as { cause?: { code?: string } };
        if (pgError.cause?.code === "22P02") {
            throw new ValidationError(`Invalid ${resourceName} ID format`);
        }
        throw error;
    }

    if (!resource) {
        if (customNotFoundErrorType === "ForbiddenError") {
            throw new ForbiddenError(`${resourceName} not found`);
        }
        throw new NotFoundError(`${resourceName} not found`);
    }

    return resource;
}
