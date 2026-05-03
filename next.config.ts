import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.icanet.se" },
      { protocol: "https", hostname: "image.shop.ica.se" },
    ],
  },
};

export default nextConfig;
