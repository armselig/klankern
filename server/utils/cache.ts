/**
 * @fileoverview Cache control utilities for API responses.
 * Provides consistent caching strategies across the application.
 */

import type { H3Event } from "h3";
import { getHeader, setHeader } from "h3";

/**
 * Cache control configurations for different types of content
 */
export const CACHE_CONTROL = {
    /** No caching - for sensitive or frequently changing data */
    NO_CACHE: "no-cache, no-store, must-revalidate",

    /** Short cache - for data that changes frequently (5 minutes) */
    SHORT: "public, max-age=300",

    /** Medium cache - for moderately stable data (1 hour) */
    MEDIUM: "public, max-age=3600",

    /** Long cache - for stable reference data (24 hours) */
    LONG: "public, max-age=86400",

    /** Static assets cache (30 days) */
    STATIC: "public, max-age=2592000, immutable",
} as const;

/**
 * Sets cache control headers on an HTTP response
 *
 * @param event - H3 event object
 * @param cacheControl - Cache control header value
 *
 * @example
 * ```typescript
 * // For user lists that change moderately
 * setCacheHeaders(event, CACHE_CONTROL.SHORT);
 *
 * // For role definitions that rarely change
 * setCacheHeaders(event, CACHE_CONTROL.LONG);
 * ```
 */
export function setCacheHeaders(event: H3Event, cacheControl: string): void {
    setHeader(event, "Cache-Control", cacheControl);
    setHeader(event, "Vary", "Accept-Encoding");
}

/**
 * Sets no-cache headers for sensitive endpoints
 *
 * @param event - H3 event object
 */
export function setNoCacheHeaders(event: H3Event): void {
    setCacheHeaders(event, CACHE_CONTROL.NO_CACHE);
    setHeader(event, "Pragma", "no-cache");
    setHeader(event, "Expires", "0");
}

/**
 * Sets ETag header for conditional requests
 *
 * @param event - H3 event object
 * @param etag - ETag value (will be quoted automatically)
 *
 * @example
 * ```typescript
 * const userHash = hashObject(userData);
 * setETagHeader(event, userHash);
 * ```
 */
export function setETagHeader(event: H3Event, etag: string): void {
    setHeader(event, "ETag", `"${etag}"`);
}

/**
 * Checks if the request has a matching If-None-Match header
 *
 * @param event - H3 event object
 * @param etag - Current ETag value
 * @returns true if the client's ETag matches (304 Not Modified should be returned)
 */
export function isNotModified(event: H3Event, etag: string): boolean {
    const ifNoneMatch = getHeader(event, "if-none-match");
    return ifNoneMatch === `"${etag}"`;
}

/**
 * Simple hash function for creating ETags from objects
 *
 * @param obj - Object to hash
 * @returns Hash string suitable for ETag
 */
export function hashObject(obj: unknown): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}
