// Generates src/database.ts from the real database schema, never a local Supabase (owner's rule): DATABASE_URL comes
// from apps/api/.env. The file is written only when generation succeeds, so a failure never empties it.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../../node_modules/supabase/dist/supabase.js", import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set: it is read from apps/api/.env");

const types = execFileSync(process.execPath, [cli, "gen", "types", "typescript", "--db-url", url, "--schema", "public"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
writeFileSync(new URL("./src/database.ts", import.meta.url), types);
