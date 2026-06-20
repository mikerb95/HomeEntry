import { getConfig } from "@/db/queries";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function ResidentRegisterPage() {
  const config = await getConfig();
  const session = await getSession();
  const prefill =
    session?.role === "resident"
      ? { tower: session.tower, apt: session.apt, phone: session.phone }
      : null;

  return (
    <Shell>
      <RegisterForm
        towers={config.towers}
        aptsPerTower={config.aptsPerTower}
        prefill={prefill}
        loggedIn={!!prefill}
      />
    </Shell>
  );
}
