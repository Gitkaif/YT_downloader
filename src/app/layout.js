import "./globals.css";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

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
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'linear-gradient(90deg, #1d4ed8 100%)',
            color: '#fff',
            boxShadow: '0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 12px' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="row" style={{ gap: 16, alignItems: 'center' }}>
                <Link href="/" className="brand" style={{ fontSize: 24, textDecoration: 'none', color: '#fff' }}>VidSaverPro</Link>
                <nav className="row" style={{ gap: 16 }}>
                  <Link href="/" style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>YouTube</Link>
                  <Link href="/reels" style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>Reels</Link>
                </nav>
              </div>
              <div style={{ filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }}>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <main className="container" style={{ padding: '1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
