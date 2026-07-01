import postgres from "postgres";

// Danger: wipes the entire `public` schema so `db:reset` always starts from a
// truly clean slate. This sidesteps `drizzle-kit push` choking when a migration
// adds NOT NULL columns to a table that already has rows (dev-only concern).
//
// Safety valve: refuse to run against anything that isn't an obvious local DB.
// This must NEVER touch the Neon production database, which lives in .env.local.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (expected local .env).");

  const host = new URL(url).hostname;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocal) {
    throw new Error(
      `Refusing to drop schema on non-local host "${host}". db:reset is ` +
        `dev-only; it must never run against a remote/production database.`,
    );
  }

  const sql = postgres(url, { max: 1 });
  console.log(`Dropping schema "public" on ${host}…`);
  await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await sql.end();
  console.log("Schema reset. Run push + seed next.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
