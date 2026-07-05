import { listConjuntos } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { LoginPortal } from "@/components/LoginPortal";
import { PwaInstallModal } from "@/components/PwaInstallModal";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const conjuntos = await listConjuntos();

  return (
    <Shell>
      <LoginPortal
        conjuntos={conjuntos.map((c) => ({ slug: c.slug, name: c.name }))}
      />
      <PwaInstallModal />
    </Shell>
  );
}
