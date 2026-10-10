import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CookieBanner } from "@/components/legal/cookie-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nicolò Service — tecnico audio e luci",
  description:
    "Servizi professionali di audio live, illuminazione e supporto tecnico per eventi, concerti e manifestazioni.",
  applicationName: "Nicolò N.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Nicolò N.",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
