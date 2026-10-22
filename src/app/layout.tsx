import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Collège Privé Kaloh — Gestion des heures",
  description: "Pointage, validation et paie des enseignants — Collège Privé Kaloh",
  applicationName: "Kaloh Heures",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kaloh Heures",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1B38",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
