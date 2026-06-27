import "server-only";
import webpush from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

// VAPID identifies our server to the push services (Apple/Google/Mozilla).
// Missing config simply disables push — WhatsApp still works on its own.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return !!(PUBLIC && PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  // Where the notification opens the resident when tapped.
  url: string;
  tag?: string;
};

// Send a notification to every device registered for an apartment. Dead
// subscriptions (404/410 from the push service) are pruned so the table stays
// clean. Never throws to the caller — push is best-effort beside WhatsApp.
export async function sendPushToApt(
  conjuntoId: string,
  aptoKey: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.conjuntoId, conjuntoId),
        eq(pushSubscriptions.aptoKey, aptoKey),
      ),
    );
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(
              and(
                eq(pushSubscriptions.conjuntoId, conjuntoId),
                eq(pushSubscriptions.endpoint, s.endpoint),
              ),
            );
          pruned++;
        }
        // Other errors (network, 5xx) are swallowed; the next alert retries.
      }
    }),
  );

  return { sent, pruned };
}
