import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
  // Add the allowedDevOrigins configuration for development
  allowedDevOrigins: ['https://6000-firebase-studio-1749051806683.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev'],
};

export default nextConfig;
