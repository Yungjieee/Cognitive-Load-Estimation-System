import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // @ts-expect-error - instrumentationHook is supported but not in types yet
    instrumentationHook: true,
  },
};

export default nextConfig;
