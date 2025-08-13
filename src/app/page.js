import HomeClient from "../components/HomeClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const url = sp?.get ? sp.get('url') : sp?.url;
  if (!url) return {};
  return {
    title: `Download · ${url}`,
    description: `Download video or audio from ${url}`,
    openGraph: {
      title: `Download · ${url}`,
      description: `Download video or audio from ${url}`,
      url: `/?url=${encodeURIComponent(url)}`,
    },
  };
}

export default function Home() {
  return <HomeClient />;
}
