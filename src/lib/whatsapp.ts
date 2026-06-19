import "server-only";
import { digits } from "./format";

export type AlertType = "visita" | "encomienda" | "mensaje";

export function buildMessage(
  type: AlertType,
  complexName: string,
  place: string,
  note?: string,
): string {
  if (type === "visita") {
    return `Portería ${complexName}: Tiene una VISITA esperando en la entrada para el ${place}. Por favor confirme si autoriza el ingreso.`;
  }
  if (type === "encomienda") {
    return `Portería ${complexName}: Llegó una ENCOMIENDA a su nombre (${place}). Puede reclamarla en la portería.`;
  }
  return note && note.trim()
    ? `Portería ${complexName} (${place}): ${note.trim()}`
    : `Portería ${complexName}: Tiene un mensaje de la administración para el ${place}.`;
}

export function waLink(phone: string, text: string): string {
  const cc = process.env.COUNTRY_CODE || "57";
  return `https://wa.me/${cc}${digits(phone)}?text=${encodeURIComponent(text)}`;
}

export function whatsappMode(): "preview-then-open" | "open-directly" {
  return process.env.WHATSAPP_MODE === "open-directly"
    ? "open-directly"
    : "preview-then-open";
}

export type SendResult =
  | { delivered: true }
  | { delivered: false; link: string };

// Sends via the Meta WhatsApp Cloud API when credentials exist; otherwise
// returns a wa.me link so the client can open the chat (faithful to the demo).
export async function sendWhatsApp(
  phone: string,
  text: string,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const cc = process.env.COUNTRY_CODE || "57";

  if (token && phoneId) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `${cc}${digits(phone)}`,
          type: "text",
          text: { body: text },
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`WhatsApp API error: ${res.status}`);
    }
    return { delivered: true };
  }

  return { delivered: false, link: waLink(phone, text) };
}
