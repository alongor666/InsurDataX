import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "export",  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // The allowedDevOrigins configuration has been removed.
};

export default nextConfig;
