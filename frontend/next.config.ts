import type { NextConfig } from "next";

/**
 * Proxy Next → API: su Mint usa API_INTERNAL_URL (127.0.0.1:4100).
 * Su Netlify usa NEXT_PUBLIC_API_URL (Tailscale / dominio pubblico).
 */
function apiRewriteBase(): string {
  const internal = process.env.API_INTERNAL_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4100"
  ).replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async rewrites() {
    const base = apiRewriteBase();
    return [
      { source: "/api/:path*", destination: `${base}/api/:path*` },
      { source: "/uploads/:path*", destination: `${base}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
