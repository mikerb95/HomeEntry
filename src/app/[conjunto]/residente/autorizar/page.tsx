import { requireResident } from "@/lib/auth";
import { getConjuntoById } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { AuthorizeForm } from "./AuthorizeForm";

export const dynamic = "force-dynamic";

export default async function AuthorizePage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireResident(slug);
  const conjunto = await getConjuntoById(session.conjuntoId);

  return (
    <Shell
      chrome={{
        title: conjunto?.name ?? "Conjunto",
        sub: `Apto ${session.apt} · Torre ${session.tower.slice(1)}`,
        role: "Residente",
        badgeBg: "#EAF1FF",
        badgeFg: "#2F6BFF",
      }}
    >
      <AuthorizeForm slug={slug} />
    </Shell>
  );
}
