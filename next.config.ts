import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static file serving for dynamically generated images
  async rewrites() {
    return [
      {
        source: '/images/:path*',
        destination: '/api/image-proxy/:path*',
      },
    ];
  },
};

export default nextConfig;
