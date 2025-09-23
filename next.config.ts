import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 启用静态导出
  output: 'export',

  // 确保路由正确处理
  trailingSlash: false,

  // 静态导出时图片需要取消优化
  images: {
    unoptimized: true
  },

	// turbopack: {
	// 	root: "../"
	// }

	// transpilePackages: ['ts-x', 'ts-nc', 'ts-concurrency'],
};

export default nextConfig;
