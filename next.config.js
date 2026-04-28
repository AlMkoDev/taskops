/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
