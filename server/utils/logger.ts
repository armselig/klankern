import { createLogger, format, type Logform, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf((info: Logform.TransformableInfo) => {
    const { level, message, timestamp, stack } = info;
    const formattedTimestamp = String(timestamp);
    const formattedLevel = String(level);

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

    return `${formattedTimestamp} ${formattedLevel}: ${formattedMessage}`;
});

export const logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug", // Log level based on environment
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    transports: [
        new transports.Console({
            format: combine(
                colorize(), // Add colors for console output
                logFormat,
            ),
        }),
        // In a production environment, you might add file transports or external logging services
        // new transports.File({ filename: 'error.log', level: 'error' }),
        // new transports.File({ filename: 'combined.log' }),
    ],
    exceptionHandlers: [
        new transports.Console({
            format: combine(colorize(), logFormat),
        }),
        // new transports.File({ filename: 'exceptions.log' }),
    ],
    rejectionHandlers: [
        new transports.Console({
            format: combine(colorize(), logFormat),
        }),
        // new transports.File({ filename: 'rejections.log' }),
    ],
});

// If not in production, log to console with simple format
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new transports.Console({
            format: format.simple(),
        }),
    );
}
