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
      <body>{children}</body>
    </html>
  );
}
