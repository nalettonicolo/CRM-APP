import type { NextConfig } from "next";

/** Target rete locale per proxy Next → Express (deploy autonomo su Mint). */
function apiRewriteBase(): string {
  const internal = process.env.API_INTERNAL_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  const base = pub.replace(/\/$/, "");
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return base;
    return "http://127.0.0.1:4100";
  } catch {
    return "http://127.0.0.1:4100";
  }
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
