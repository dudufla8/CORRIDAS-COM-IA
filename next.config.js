/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://taxidoispontozero.com.br https://*.taxidoispontozero.com.br http://localhost:*;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
