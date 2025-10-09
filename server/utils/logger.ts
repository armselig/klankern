/**
 * @fileoverview Winston logger configuration for server-side logging.
 * Provides structured logging with appropriate levels based on environment.
 *
 * @example
 * ```typescript
 * import { logger } from '#server/utils/logger';
 *
 * logger.info('User created successfully', { userId: '123' });
 * logger.error('Database connection failed', error);
 * ```
 */

import { createLogger, format, type Logform, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, printf, colorize, json } = format;

// Custom log format for the console
const consoleLogFormat = printf((info: Logform.TransformableInfo) => {
    const { level, message, timestamp, stack } = info;
    const formattedTimestamp = String(timestamp);
    const showTimestamp = false;

    const emojiMap: { [level: string]: string } = {
        error: "❌",
        warn: "⚠️",
        info: "ℹ️",
        http: "🌐",
        verbose: "🔍",
        debug: "🐛",
        silly: "🤪",
    };
    const rawLevel = level.replace(/\x1B\[[0-9;]*[mG]/g, "");
    const emoji = emojiMap[rawLevel] || "";

    let formattedMessage: string;
    if (stack) {
        formattedMessage =
            stack instanceof Error
                ? stack.stack || String(stack)
                : String(stack);
    } else if (message) {
        formattedMessage =
            message instanceof Error
                ? message.message || String(message)
                : String(message);
    } else {
        formattedMessage = "";
    }

    const coloredTimestamp = `\x1b[90m[${formattedTimestamp}]\x1b[0m`;
    const timestampString = showTimestamp ? `${coloredTimestamp} ` : "";

    return `${timestampString}${emoji} ${level}: ${formattedMessage}`;
});

const fileTransport = new DailyRotateFile({
    filename: "log/klankern-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: combine(timestamp(), json()),
});

export const logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleLogFormat,
    ),
    transports: [
        new transports.Console({
            format: combine(colorize(), consoleLogFormat),
        }),
        fileTransport,
    ],
    exceptionHandlers: [
        new transports.Console({
            format: combine(colorize(), consoleLogFormat),
        }),
    ],
    rejectionHandlers: [
        new transports.Console({
            format: combine(colorize(), consoleLogFormat),
        }),
    ],
});
