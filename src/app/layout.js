import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "VidSaverPro",
    template: "%s · VidSaverPro",
  },
  description: "Fast, simple YouTube video and audio downloader. No ads.",
  openGraph: {
    title: "VidSaverPro",
    description: "Fast, simple YouTube video and audio downloader. No ads.",
    url: "/",
    siteName: "VidSaverPro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VidSaverPro",
    description: "Fast, simple YouTube video and audio downloader. No ads.",
  },
};

// Inline script to set theme early to avoid FOUC
const themeInitializer = `(() => {
  try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch {}
})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body suppressHydrationWarning>
        <Navbar />
        <main className="container" style={{ padding: '1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
