import "server-only";
import QRCode from "qrcode";

// Produce a real QR code (as a data URL) encoding the verification payload.
export async function qrDataUrl(code: string): Promise<string> {
  const payload = `PORTAL:${code}`;
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 220,
    color: { dark: "#0F141A", light: "#FFFFFF" },
  });
}
