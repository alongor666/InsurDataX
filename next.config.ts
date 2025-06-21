import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: "export", // This line is removed to enable server-side rendering for auth
  // typescript: {
  //   ignoreBuildErrors: true, // Removed
  // },
  // eslint: {
  //   ignoreDuringBuilds: true, // Removed
  // },
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
