import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
    schema: "./server/db/schema.ts",
    out: "./server/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "klankern_user",
        password: process.env.DB_PASSWORD || "klankern_password",
        database: process.env.DB_NAME || "klankern_db",
        ssl: false,
    },
});
