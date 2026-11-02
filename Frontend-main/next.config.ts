import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server under .next/standalone for the Docker image.
  output: "standalone",
  /* config options here */
};

export default nextConfig;
