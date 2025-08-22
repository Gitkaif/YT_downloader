// Force static generation
export const dynamic = 'force-static';

// Revalidate every 24 hours
export const revalidate = 86400;

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidsaverproo.web.app';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Add more URLs here as needed
  ];
}


