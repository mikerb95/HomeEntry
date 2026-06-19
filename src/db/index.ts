import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Reuse across hot-reloads / serverless invocations.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
  drizzleDb?: DB;
};

// Lazily initialise so that merely *importing* the db module never connects
// or throws. This matters for `next build`, which imports page modules (and
// their dependencies) while collecting page data — at that point env vars like
// DATABASE_URL may be absent. The connection is only created on first query.
function init(): DB {
  if (globalForDb.drizzleDb) return globalForDb.drizzleDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }

  const client = globalForDb.pgClient ?? postgres(connectionString, { max: 5 });
  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
    globalForDb.drizzleDb = instance;
  }
  return instance;
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const instance = init();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
}) as DB;

export { schema };
