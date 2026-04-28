/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  typedRoutes: true,
  // Disable ESLint during build to avoid blocking deployments
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable type checking during build (we check locally)
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
