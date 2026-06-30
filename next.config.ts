import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;