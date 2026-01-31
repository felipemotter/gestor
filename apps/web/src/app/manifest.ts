import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestor",
    short_name: "Gestor",
    description: "Controle financeiro familiar",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2f7",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
