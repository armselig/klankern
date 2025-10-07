/**
 * @fileoverview Health check endpoint for monitoring and load balancers.
 * Returns application status and basic system information.
 */

import { sql } from "drizzle-orm";
import { defineEventHandler, setResponseStatus } from "h3";
import { db } from "#server/db";
import { CACHE_CONTROL, setCacheHeaders } from "#server/utils/cache";
import { logger } from "#server/utils/logger";

interface HealthStatus {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    checks: {
        database: "healthy" | "unhealthy";
        memory: "healthy" | "warning" | "critical";
    };
    version: string;
    environment: string;
}

export default defineEventHandler(async (event): Promise<HealthStatus> => {
    const startTime = Date.now();

    // Don't cache health checks
    setCacheHeaders(event, CACHE_CONTROL.NO_CACHE);

    const checks = {
        database: "unhealthy" as const,
        memory: "healthy" as const,
    };

    // Check database connectivity
    try {
        await db.execute(sql`SELECT 1`);
        checks.database = "healthy";
    } catch (error) {
        logger.error("Database health check failed:", error);
        checks.database = "unhealthy";
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    if (memoryUsageMB > 1024) {
        // > 1GB
        checks.memory = "critical";
    } else if (memoryUsageMB > 512) {
        // > 512MB
        checks.memory = "warning";
    }

    const overallStatus = Object.values(checks).every(
        (check) => check === "healthy",
    )
        ? "healthy"
        : "unhealthy";

    const response: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
        version: process.env.npm_package_version || "unknown",
        environment: process.env.NODE_ENV || "development",
    };

    // Set appropriate status code
    if (overallStatus === "unhealthy") {
        setResponseStatus(event, 503);
    }

    // Log health check duration if it's slow
    const duration = Date.now() - startTime;
    if (duration > 1000) {
        logger.warn("Slow health check", { duration });
    }

    return response;
});
