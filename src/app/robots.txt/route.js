export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
}


