import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Collège Privé Kaloh — Gestion des heures",
    short_name: "Kaloh Heures",
    description: "Pointage, validation et paie des enseignants — Collège Privé Kaloh",
    start_url: "/",
    display: "standalone",
    background_color: "#050B1A",
    theme_color: "#0B1B38",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
