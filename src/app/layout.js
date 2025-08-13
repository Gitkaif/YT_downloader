import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "YouTube Downloader",
    template: "%s · YouTube Downloader",
  },
  description: "Fast, simple YouTube video and audio downloader. No ads.",
  openGraph: {
    title: "YouTube Downloader",
    description: "Fast, simple YouTube video and audio downloader. No ads.",
    url: "/",
    siteName: "YouTube Downloader",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Downloader",
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
        {children}
      </body>
    </html>
  );
}
