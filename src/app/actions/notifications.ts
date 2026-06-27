"use server";

import { requireGuard } from "@/lib/auth";
import { listAuthsSince } from "@/db/queries";

export type AuthNotification = {
  id: string;
  code: string;
  visitor: string;
  tower: string;
  apt: string;
  plate: string;
  createdAtIso: string;
};

export type PollResult = {
  // Server clock, used as the cursor for the next poll so we never miss or
  // re-deliver rows due to client/server clock drift.
  nowIso: string;
  items: AuthNotification[];
};

// Return authorizations created since `sinceIso` for the guard's conjunto.
// The guard screen polls this to surface new visitor authorizations.
export async function pollAuthNotifications(
  slug: string,
  sinceIso: string,
): Promise<PollResult> {
  const session = await requireGuard(slug);
  const parsed = new Date(sinceIso);
  const since = isNaN(parsed.getTime()) ? new Date(0) : parsed;
  const nowIso = new Date().toISOString();

  const rows = await listAuthsSince(session.conjuntoId, since);
  const items: AuthNotification[] = rows.map((a) => ({
    id: a.id,
    code: a.code,
    visitor: a.visitor,
    tower: a.tower,
    apt: a.apt,
    plate: a.plate,
    createdAtIso: a.createdAt.toISOString(),
  }));

  return { nowIso, items };
}
