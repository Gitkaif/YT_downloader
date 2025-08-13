/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
