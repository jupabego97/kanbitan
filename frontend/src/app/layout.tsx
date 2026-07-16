import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanbitan · Centro de compras",
  description: "Convierte faltantes de mostrador en compras que avanzan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
