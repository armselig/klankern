import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // Log level based on environment
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
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
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.simple(),
    }),
  );
}

export default logger;
