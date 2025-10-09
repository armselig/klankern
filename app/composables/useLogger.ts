/**
 * A simple client-side logger composable.
 * In a real application, this would likely send logs to a server-side endpoint
 * or integrate with a client-side logging library.
 */
export const useLogger = () => {
    const log = (level: string, ...args: unknown[]) => {
        // Changed any[] to unknown[]
        if (import.meta.client) {
            // For now, just use console.log on the client side.
            // This can be replaced with a more sophisticated client-side logger later.
            const formattedArgs = args.map((arg) => {
                if (arg instanceof Error) {
                    return `${arg.message}\n${arg.stack}`;
                }
                return arg;
            });

            switch (level) {
                case "info":
                    console.info(`[${level.toUpperCase()}]`, ...formattedArgs);
                    break;
                case "error":
                    console.error(`[${level.toUpperCase()}]`, ...formattedArgs);
                    break;
                case "warn":
                    console.warn(`[${level.toUpperCase()}]`, ...formattedArgs);
                    break;
                case "debug":
                    console.debug(`[${level.toUpperCase()}]`, ...formattedArgs);
                    break;
                default:
                    console.log(`[${level.toUpperCase()}]`, ...formattedArgs);
            }
        }
    };

    return {
        info: (...args: unknown[]) => log("info", ...args),
        error: (...args: unknown[]) => log("error", ...args),
        warn: (...args: unknown[]) => log("warn", ...args),
        log: (...args: unknown[]) => log("log", ...args),
        debug: (...args: unknown[]) => log("debug", ...args),
    };
};
