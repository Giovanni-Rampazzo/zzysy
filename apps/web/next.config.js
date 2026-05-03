/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
}

module.exports = nextConfig
