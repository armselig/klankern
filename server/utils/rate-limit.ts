/**
 * @fileoverview Simple in-memory rate limiting utilities.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

import type { H3Event } from "h3";
import { createError, getHeader, setHeader, getRequestIP } from "h3";
import { logger } from "./logger";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
    /** Maximum number of requests */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Custom identifier function (defaults to client IP) */
    keyGenerator?: (event: H3Event) => string;
    /** Custom error message */
    message?: string;
}

/**
 * Rate limit storage (in-memory)
 * In production, this should be replaced with Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Cleanup expired entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Cleanup every minute

/**
 * Creates a rate limiting middleware function
 *
 * @param config - Rate limit configuration
 * @returns Rate limiting function
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   max: 10,
 *   windowMs: 60 * 1000, // 1 minute
 * });
 *
 * export default defineEventHandler(async (event) => {
 *   await limiter(event);
 *   // API logic here
 * });
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
    const {
        max,
        windowMs,
        keyGenerator = (event) => getRequestIP(event) || "unknown",
        message = "Too many requests",
    } = config;

    return async (event: H3Event): Promise<void> => {
        const key = keyGenerator(event);
        const now = Date.now();

        let data = rateLimitStore.get(key);

        // Initialize or reset if window expired
        if (!data || now > data.resetTime) {
            data = {
                count: 0,
                resetTime: now + windowMs,
            };
            rateLimitStore.set(key, data);
        }

        data.count++;

        // Set rate limit headers
        setHeader(event, "X-RateLimit-Limit", max.toString());
        setHeader(
            event,
            "X-RateLimit-Remaining",
            Math.max(0, max - data.count).toString(),
        );
        setHeader(
            event,
            "X-RateLimit-Reset",
            new Date(data.resetTime).toISOString(),
        );

        if (data.count > max) {
            logger.warn("Rate limit exceeded", {
                key,
                count: data.count,
                max,
                userAgent: getHeader(event, "user-agent"),
                path: event.node.req.url,
            });

            throw createError({
                statusCode: 429,
                statusMessage: message,
                data: {
                    retryAfter: Math.ceil((data.resetTime - now) / 1000),
                },
            });
        }
    };
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
    /** Strict rate limiter for authentication endpoints */
    auth: createRateLimiter({
        max: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: "Too many authentication attempts",
    }),

    /** Standard rate limiter for API endpoints */
    api: createRateLimiter({
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: "API rate limit exceeded",
    }),

    /** Generous rate limiter for public endpoints */
    public: createRateLimiter({
        max: 1000,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: "Rate limit exceeded",
    }),
} as const;
