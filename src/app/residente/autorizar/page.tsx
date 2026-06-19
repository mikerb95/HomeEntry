import { requireResident } from "@/lib/auth";
import { getConfig } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { AuthorizeForm } from "./AuthorizeForm";

export default async function AuthorizePage() {
  const session = await requireResident();
  const config = await getConfig();

  return (
    <Shell
      chrome={{
        title: config.name,
        sub: `Apto ${session.apt} · Torre ${session.tower.slice(1)}`,
        role: "Residente",
        badgeBg: "#EAF1FF",
        badgeFg: "#2F6BFF",
      }}
    >
      <AuthorizeForm />
    </Shell>
  );
}
