/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Allow cross-origin requests from preview environment
  allowedDevOrigins: [
    '.space.z.ai',
  ],
};

export default nextConfig;
