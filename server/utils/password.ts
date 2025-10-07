import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { logger } from "../utils/logger";

const scryptAsync = promisify(scrypt);

/**
 * Verifies a password against a stored scrypt hash.
 *
 * @param password - The plain text password to verify
 * @param hash - The stored scrypt hash in format: $scrypt$n=16384,r=8,p=1$salt$key
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await customVerifyPassword("mypassword", storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
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
        const n = parseInt(params[0].split("=")[1], 10);
        const r = parseInt(params[1].split("=")[1], 10);
        const p = parseInt(params[2].split("=")[1], 10);
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

/**
 * Hashes a password using scrypt with secure defaults.
 *
 * @param password - The plain text password to hash
 * @returns Promise resolving to a scrypt hash string in format: $scrypt$n=16384,r=8,p=1$salt$key
 *
 * @example
 * ```typescript
 * const hashedPassword = await customHashPassword("mypassword");
 * // Returns: "$scrypt$n=16384,r=8,p=1$base64salt$base64key"
 * ```
 */
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
