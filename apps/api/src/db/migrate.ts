import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

/** Apply pending Drizzle SQL migrations. Safe to call on every API boot. */
export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString, { max: 1 });
  try {
    const db = drizzle(client);
    console.log(`Running database migrations from ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("Database migrations complete");
  } finally {
    await client.end();
  }
}
