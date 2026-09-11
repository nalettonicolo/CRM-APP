import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nicolò Service Enterprise",
  description: "Gestionale enterprise — progetti, automazioni, BI, team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
