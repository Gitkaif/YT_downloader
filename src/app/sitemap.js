export default async function sitemap() {
  return [
    {
      url: 'https://example.com/',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}


