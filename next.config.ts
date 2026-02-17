import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
  turbopack: {
    resolveAlias: {
      bufferutil: { browser: '' },
      'utf-8-validate': { browser: '' },
    },
  },
};

export default nextConfig;
