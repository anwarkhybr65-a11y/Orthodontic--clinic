import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@libsql/client"],
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 60,
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.module.rules.push({
        test: /[\\/]next[\\/]dist[\\/].*(app-router|link|create-initial-router-state)\.js$/,
        enforce: "pre",
        use: path.join(__dirname, "lib/dev-prefetch-loader.js"),
      });
    }
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      externals.push("node:sqlite");
      config.externals = externals;
    }
    return config;
  },
};

export default nextConfig;
