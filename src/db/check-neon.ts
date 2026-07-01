import postgres from "postgres";
async function main() {
  const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
  const rows = await sql`select slug, mora_rate_pct, mora_grace_days from conjuntos limit 5`;
  console.log(rows);
  const tables = await sql`select table_name from information_schema.tables where table_schema='public' and table_name in ('vendors','charges','payments','expenses') order by table_name`;
  console.log(tables);
  await sql.end();
}
main();
