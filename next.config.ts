import type { NextConfig } from "next";
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/receive',
        destination: 'https://762e-128-185-112-57.ngrok-free.app/receive',
      },
    ];
  },
};
const nextConfig: NextConfig = {
  /* config options here */
  
};

export default nextConfig;
