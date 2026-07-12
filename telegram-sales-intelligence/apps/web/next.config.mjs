import process from 'node:process';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4010';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
