import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nosotros - Nuestra Historia",
  description: "Un libro interactivo de historias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
