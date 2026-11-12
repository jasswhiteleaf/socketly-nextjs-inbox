import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(import.meta.dirname) },
  serverExternalPackages: ['pg'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};
export default config;
