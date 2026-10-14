import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("DATABASE_URL is not set. Local file saves in .data do not need a migration.");
  process.exit(0);
}

const sql = postgres(databaseUrl, { max: 1 });
const file = readFileSync(path.join(process.cwd(), "drizzle/0000_init.sql"), "utf8");
await sql.unsafe(file);
await sql.end();
console.log("Applied drizzle/0000_init.sql");
