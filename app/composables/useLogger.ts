/**
 * A simple client-side logger composable.
 * In a real application, this would likely send logs to a server-side endpoint
 * or integrate with a client-side logging library.
 */
export const useLogger = () => {
    const log = (level: string, ...args: any[]) => {
        if (import.meta.client) {
            // For now, just use console.log on the client side.
            // This can be replaced with a more sophisticated client-side logger later.
            switch (level) {
                case "info":
                    console.info(`[${level.toUpperCase()}]`, ...args);
                    break;
                case "error":
                    console.error(`[${level.toUpperCase()}]`, ...args);
                    break;
                case "warn":
                    console.warn(`[${level.toUpperCase()}]`, ...args);
                    break;
                default:
                    console.log(`[${level.toUpperCase()}]`, ...args);
            }
        }
    };

    return {
        info: (...args: any[]) => log("info", ...args),
        error: (...args: any[]) => log("error", ...args),
        warn: (...args: any[]) => log("warn", ...args),
        log: (...args: any[]) => log("log", ...args),
    };
};
