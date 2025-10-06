import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { logger } from "../utils/logger";

const scryptAsync = promisify(scrypt);

export async function customVerifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    try {
        const parts = hash.split("$");
        if (parts.length !== 5 || parts[1] !== "scrypt") {
            return false; // Not a valid scrypt hash format
        }

        const params = parts[2].split(",");
        const n = parseInt(params[0].split("=")[1]);
        const r = parseInt(params[1].split("=")[1]);
        const p = parseInt(params[2].split("=")[1]);
        const salt = Buffer.from(parts[3], "base64");
        const storedKey = Buffer.from(parts[4], "base64");

        const derivedKey = (await scryptAsync(
            password,
            salt,
            storedKey.length,
            { N: n, r: r, p: p },
        )) as Buffer;

        // Use timingSafeEqual to prevent timing attacks
        return timingSafeEqual(derivedKey, storedKey);
    } catch (error) {
        logger.error("Error during password verification:", error);
        return false;
    }
}

export async function customHashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64");
    const n = 16384;
    const r = 8;
    const p = 1;
    const derivedKey = (await scryptAsync(password, salt, 32, {
        N: n,
        r: r,
        p: p,
    })) as Buffer;

    return `$scrypt$n=${n},r=${r},p=${p}$${Buffer.from(salt).toString("base64")}$${derivedKey.toString("base64")}`;
}
