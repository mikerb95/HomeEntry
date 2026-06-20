import { notFound } from "next/navigation";
import { getConjuntoBySlug, getResident } from "@/db/queries";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function ResidentRegisterPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) notFound();

  const session = await getSession();
  let prefill: { tower: string; apt: string; phone: string } | null = null;
  if (session?.role === "resident" && session.conjuntoSlug === slug) {
    const me = await getResident(conjunto.id, session.aptoKey);
    prefill = {
      tower: session.tower,
      apt: session.apt,
      phone: me?.phone ?? "",
    };
  }

  return (
    <Shell>
      <RegisterForm
        slug={slug}
        towers={conjunto.towers}
        aptsPerTower={conjunto.aptsPerTower}
        prefill={prefill}
        loggedIn={!!prefill}
      />
    </Shell>
  );
}
