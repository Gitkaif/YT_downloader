/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side features including API routes
  // API routes can 404 on Vercel when a trailing slash is present ("/api/info/")
  // Disable global trailing slashes so API endpoints remain at "/api/..." without a slash
  trailingSlash: false,
  
  // Configure images
  images: {
    domains: [
      'i.ytimg.com',
      'img.youtube.com',
      'yt3.ggpht.com',
      '*.fbcdn.net',
      '*.cdninstagram.com',
      '*.instagram.com',
      '*.youtube.com'
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '*.instagram.com' },
    ],
  },
  
  // Server components external packages
  serverExternalPackages: [
    'fluent-ffmpeg',
    'ffmpeg-static',
    '@distube/ytdl-core',
    'instagram-url-direct',
    'sanitize-filename'
  ],

  // Vercel-specific configuration - moved from experimental to root level
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fixes npm packages that depend on node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false
      };
    }
    
    // Add custom webpack configurations here
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add any necessary aliases here
    };
    
    return config;
  },
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Configure CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  
  // Configure redirects if needed
  async redirects() {
    return [
      // Add any redirects here
    ];
  },
  
  // Environment variables
  env: {
    // Add any environment variables here
  },
};

export default nextConfig;
