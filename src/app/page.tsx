import { listConjuntos } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { RoleLanding } from "@/components/RoleLanding";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const conjuntos = await listConjuntos();

  return (
    <Shell>
      <RoleLanding
        conjuntos={conjuntos.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </Shell>
  );
}
