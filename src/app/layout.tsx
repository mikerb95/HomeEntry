import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "La Oportunidad · Gestión Residencial",
  description: "Gestión de portería conectada por WhatsApp.",
  // Lets iOS launch the home-screen install in standalone (app) mode, which is
  // a prerequisite for Web Push notifications on iPhone.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HomeEntry",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2F6BFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${jakarta.variable} ${grotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
