/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5008/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5008/uploads/:path*',
      },
    ]
  },
};

export default nextConfig;
