/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external host requests for Clacky environment
  experimental: {
    allowedDevOrigins: ['*.clackypaas.com', 'localhost', '127.0.0.1']
  },
  
  // Enable WebSocket support for Socket.IO
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  
  // Configure headers for WebSocket and CORS
  async headers() {
    return [
      {
        source: '/socket.io/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          }
        ]
      }
    ];
  },
  
  // Rewrites for Socket.IO
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket.io/:path*'
      }
    ];
  }
};

module.exports = nextConfig;