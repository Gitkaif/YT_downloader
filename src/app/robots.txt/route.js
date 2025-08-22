// Force static generation
export const dynamic = 'force-static';

// Revalidate every 24 hours
export const revalidate = 86400;

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidsaverproo.web.app';
  
  return new Response(
    `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`,
    { 
      headers: { 
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400'
      } 
    }
  );
}
