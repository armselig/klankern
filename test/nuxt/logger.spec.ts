import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import winston from "winston";
import { logger } from "#server/utils/logger";

describe("server/utils/logger", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        const mockTransport = new winston.transports.Console();
        logger.clear().add(mockTransport);
        logSpy = vi.spyOn(logger.transports[0], "log");
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it("should be defined", () => {
        expect(logger).toBeDefined();
    });

    it("should log info messages", () => {
        const message = "This is an info message";
        logger.info(message);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const logObject = logSpy.mock.calls[0][0];
        expect(logObject.level).toBe("info");
        expect(logObject.message).toBe(message);
    });

    it("should log warn messages", () => {
        const message = "This is a warning message";
        logger.warn(message);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const logObject = logSpy.mock.calls[0][0];
        expect(logObject.level).toBe("warn");
        expect(logObject.message).toBe(message);
    });

    it("should log error messages", () => {
        const message = "This is an error message";
        const error = new Error("Something went wrong");
        logger.error(message, { error });

        expect(logSpy).toHaveBeenCalledTimes(1);
        const logObject = logSpy.mock.calls[0][0];
        expect(logObject.level).toBe("error");
        expect(logObject.message).toBe(message);
        expect(logObject.error).toBe(error);
    });
});
