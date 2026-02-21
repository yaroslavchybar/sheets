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
  serverExternalPackages: ['fasttext.wasm.js'],
  turbopack: {
    resolveAlias: {
      bufferutil: { browser: '' },
      'utf-8-validate': { browser: '' },
    },
  },
};

export default nextConfig;
