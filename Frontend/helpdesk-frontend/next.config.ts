import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8080';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  experimental: {
    cpus: 2,
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
