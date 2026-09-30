import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@yes-or-no/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.SERVER_INTERNAL_URL ?? 'http://localhost:3000'}/api/:path*` }];
  },
};

export default config;