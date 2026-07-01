import postgres from "postgres";
async function main() {
  const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
  const charges = await sql`select apto_key, period, amount_enc, due_date from charges order by created_at desc limit 10`;
  console.log("charges:", charges);
  const payments = await sql`select apto_key, amount_enc, method, paid_at from payments order by created_at desc limit 10`;
  console.log("payments:", payments);
  const vendors = await sql`select id, name_enc, category from vendors order by created_at desc limit 10`;
  console.log("vendors:", vendors);
  await sql.end();
}
main();
