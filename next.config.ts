import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
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
