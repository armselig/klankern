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
        if (parts.length !== 5 || parts[1] !== "scrypt" || !parts[2]) {
            return false; // Not a valid scrypt hash format
        }

        const params = parts[2].split(",");
        if (params.length !== 3) {
            return false;
        }

        const nParam = params[0]?.split("=")[1];
        const rParam = params[1]?.split("=")[1];
        const pParam = params[2]?.split("=")[1];
        const saltString = parts[3];
        const storedKeyString = parts[4];

        if (!nParam || !rParam || !pParam || !saltString || !storedKeyString) {
            return false;
        }

        const n = parseInt(nParam, 10);
        const r = parseInt(rParam, 10);
        const p = parseInt(pParam, 10);
        const saltBuffer = Buffer.from(saltString, "base64");
        const storedKey = Buffer.from(storedKeyString, "base64");

        // TypeScript types for promisified scrypt don't include the options parameter,
        // but the runtime function does support it. We use type assertion to work around this.
        const derivedKey = (await (scryptAsync as any)(
            password,
            saltBuffer,
            storedKey.length,
            { N: n, r, p },
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
    const saltBuffer = randomBytes(16);
    const n = 16384;
    const r = 8;
    const p = 1;
    // TypeScript types for promisified scrypt don't include the options parameter,
    // but the runtime function does support it. We use type assertion to work around this.
    const derivedKey = (await (scryptAsync as any)(
        password,
        saltBuffer,
        32,
        { N: n, r, p },
    )) as Buffer;

    return `$scrypt$n=${n},r=${r},p=${p}$${saltBuffer.toString("base64")}$${derivedKey.toString("base64")}`;
}
