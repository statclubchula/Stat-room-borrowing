/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow remote inventory / location photos from arbitrary hosts.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
