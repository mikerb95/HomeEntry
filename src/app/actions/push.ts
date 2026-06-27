"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireResident } from "@/lib/auth";
import { sendPushToApt } from "@/lib/push";

type WebPushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Register (or refresh) the calling resident's device subscription. Scoped to
// the resident's own apartment from the session — clients can't target others.
export async function subscribeResident(
  slug: string,
  sub: WebPushSub,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireResident(slug);
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Suscripción inválida" };
  }

  await db
    .insert(pushSubscriptions)
    .values({
      conjuntoId: session.conjuntoId,
      aptoKey: session.aptoKey,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.conjuntoId, pushSubscriptions.endpoint],
      set: {
        aptoKey: session.aptoKey,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });

  return { ok: true };
}

export async function unsubscribeResident(
  slug: string,
  endpoint: string,
): Promise<{ ok: boolean }> {
  const session = await requireResident(slug);
  if (endpoint) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.conjuntoId, session.conjuntoId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }
  return { ok: true };
}
