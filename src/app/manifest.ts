import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeEntry · Gestión Residencial",
    short_name: "HomeEntry",
    description:
      "Portería conectada: autorizaciones, alertas y avisos de tu conjunto.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F8FB",
    theme_color: "#2F6BFF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
