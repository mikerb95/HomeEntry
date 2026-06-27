import { sql } from "drizzle-orm";
import { db } from "./index";

// One-off, idempotent apply of the push_subscriptions table to a DB whose
// drizzle-kit push would otherwise require an interactive TTY. Safe to re-run.
async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
      "conjunto_id" uuid NOT NULL,
      "apto_key" text NOT NULL,
      "endpoint" text NOT NULL,
      "p256dh" text NOT NULL,
      "auth" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "push_subscriptions_conjunto_id_endpoint_pk" PRIMARY KEY ("conjunto_id","endpoint")
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "push_subscriptions"
        ADD CONSTRAINT "push_subscriptions_conjunto_id_conjuntos_id_fk"
        FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id")
        ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "push_subscriptions_apt_idx"
      ON "push_subscriptions" USING btree ("conjunto_id","apto_key");
  `);

  const check = await db.execute(
    sql`SELECT to_regclass('public.push_subscriptions') AS tbl;`,
  );
  console.log("push_subscriptions present:", check);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
