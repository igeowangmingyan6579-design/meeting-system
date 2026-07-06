const nextConfig = {
  reactStrictMode: true,
  // 禁止静态导出模式，确保 SSR/CSR hydration 正常工作
  output: 'standalone',
  // 后端API代理
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
