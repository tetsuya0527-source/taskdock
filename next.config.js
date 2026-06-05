/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true,
})

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@upstash/redis'],
}

module.exports = withPWA(nextConfig)
