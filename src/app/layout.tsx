import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gran Rifa Navideña | Constructora Painting 2 S.A.S.",
  description: "Elige tus números del 00 al 99 y participa en la Gran Rifa Navideña de Constructora Painting 2 S.A.S.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f3d2e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
