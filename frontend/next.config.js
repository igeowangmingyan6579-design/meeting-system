const nextConfig = {
  reactStrictMode: true,
  // 后端API代理 — 生产环境通过 Nginx 或同域名反代，开发环境指向 localhost:3001
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_PROXY || 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
