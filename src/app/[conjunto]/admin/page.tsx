import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
import {
  getConjuntoById,
  getFinancialSummary,
  listEvents,
  listExpenses,
  listGuards,
  listParking,
  listRecentFinanceAccessLog,
  listResidents,
  listSessions,
  listVendors,
  logAccess,
} from "@/db/queries";
import { isToday, todayStr } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { AdminPanel } from "./AdminPanel";

export default async function AdminPanelPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const [
    config,
    events,
    parking,
    sessions,
    residents,
    financeSummary,
    vendors,
    expenses,
    financeAccessLog,
  ] = await Promise.all([
    getConjuntoById(cid),
    listEvents(cid),
    listParking(cid),
    listSessions(cid),
    listResidents(cid),
    getFinancialSummary(cid),
    listVendors(cid),
    listExpenses(cid),
    listRecentFinanceAccessLog(cid, 30),
  ]);
  if (!config) return null;

  await logAccess(cid, `admin:${session.username}`, "view_finance_summary", cid);

  const totalApts = config.towers * config.aptsPerTower;
  const mVisits = events.filter((e) => e.type === "visita" && isToday(e.ts)).length;
  const mPackages = events.filter(
    (e) => e.type === "encomienda" && isToday(e.ts),
  ).length;
  const occPct = parking.length
    ? Math.round(
        (parking.filter((p) => p.status !== "free").length / parking.length) *
          100,
      )
    : 0;
  const regPct = totalApts
    ? Math.min(100, Math.round((residents.length / totalApts) * 100))
    : 0;

  return (
    <Shell
      chrome={{
        title: config.name,
        sub: "Panel de administración",
        role: "Administrador",
        badgeBg: "#EEE9FF",
        badgeFg: "#6D28D9",
      }}
    >
      <AdminPanel
        slug={slug}
        name={config.name}
        towers={config.towers}
        aptsPerTower={config.aptsPerTower}
        carSpots={config.carSpots}
        motoSpots={config.motoSpots}
        visitorRate={config.visitorRate}
        moraRatePct={config.moraRatePct}
        moraGraceDays={config.moraGraceDays}
        todayStr={todayStr()}
        mVisits={mVisits}
        mPackages={mPackages}
        occPct={occPct}
        regPct={regPct}
        events={events.map((e) => ({
          id: e.id,
          type: e.type,
          tower: e.tower,
          apto: e.apto,
          detail: e.detail,
          tsIso: e.ts.toISOString(),
        }))}
        parking={parking.map((p) => ({
          id: p.id,
          kind: p.kind as "car" | "moto",
          status: p.status as "free" | "resident" | "visitor",
          plate: p.plate,
          aptoKey: p.aptoKey,
        }))}
        sessions={sessions.map((s) => ({
          type: s.type as "resident" | "visitor",
          aptoKey: s.aptoKey,
          kind: s.kind,
          hours: s.hours,
          startIso: s.start.toISOString(),
        }))}
        aptBalances={financeSummary.aptBalances}
        carteraTotal={financeSummary.carteraTotal}
        recaudoTotal={financeSummary.recaudoTotal}
        moraTotal={financeSummary.moraTotal}
        gastoTotal={financeSummary.gastoTotal}
        balanceNeto={financeSummary.balanceNeto}
        vendors={vendors}
        expenses={expenses.map((e) => ({
          id: e.id,
          vendorId: e.vendorId,
          vendorName: e.vendorName,
          category: e.category,
          amount: e.amount,
          description: e.description,
          invoiceRef: e.invoiceRef,
          expenseDateIso: e.expenseDate.toISOString(),
          registeredBy: e.registeredBy,
        }))}
        financeAccessLog={financeAccessLog.map((l) => ({
          id: l.id,
          tsIso: l.ts.toISOString(),
          actor: l.actor,
          action: l.action,
          target: l.target,
        }))}
      />
    </Shell>
  );
}
