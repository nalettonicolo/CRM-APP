import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const base = apiUrl.replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${base}/api/:path*` },
      { source: "/uploads/:path*", destination: `${base}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
