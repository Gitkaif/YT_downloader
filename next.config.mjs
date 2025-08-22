/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side features including API routes
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      // Instagram/Facebook CDNs for reel thumbnails
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
    ],
  },
  // Ensure native/binary deps resolve from node_modules at runtime
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', '@distube/ytdl-core'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
