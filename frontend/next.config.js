const nextConfig = {
  reactStrictMode: true,
  // 后端API代理到同域名
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
