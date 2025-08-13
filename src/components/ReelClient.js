"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ProgressBar from "./ProgressBar";
import { Download, CheckCircle } from "./Icons";

export default function ReelClient() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const controllerRef = useRef(null);

  useEffect(() => () => { if (controllerRef.current) controllerRef.current.abort(); }, []);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('url');
      if (q) setUrl(q);
    } catch {}
  }, []);

  function isValidUrl(val) {
    try {
      const u = new URL(val);
      // Placeholder: accept instagram.com, facebook.com, or any reel provider we later support
      return (
        u.hostname.includes("instagram.com") ||
        u.hostname.includes("facebook.com") ||
        u.hostname.includes("reels")
      );
    } catch {
      return false;
    }
  }

  async function fetchInfo() {
    setError("");
    setInfo(null);
    if (!isValidUrl(url)) {
      setError("Please enter a valid Reel URL (e.g., Instagram).");
      return;
    }
    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/reels/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      // If the API returns a placeholder 501 with a note, surface it in the UI instead of erroring.
      if (res.status === 501 && data?.note) {
        setInfo(data);
        setError("");
        return; 
      }
      if (!res.ok) throw new Error(data?.error || "Failed to fetch reel info");
      setInfo(data);
      // reflect URL in address bar
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('url', url);
        history.replaceState(null, '', u);
      } catch {}
    } catch (e) {
      setError(e.message || "Failed to fetch reel info");
    } finally {
      setLoadingInfo(false);
    }
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 100 || i === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
  }

  async function startDownload() {
    if (!info || !url) return;
    setError("");
    setProgress(0);
    setBytesReceived(0);
    setBytesTotal(0);
    setDownloading(true);
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    try {
      // capture and then clear the input and URL param
      const currentUrl = url;
      setUrl("");
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('url');
        history.replaceState(null, '', u);
      } catch {}

      const res = await fetch(`/api/reels/download?url=${encodeURIComponent(currentUrl)}`, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Download failed (HTTP ${res.status})`);
        }
        throw new Error(`Download failed (HTTP ${res.status})`);
      }

      const reader = res.body?.getReader();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : info?.suggestedFilename || 'reel.mp4';

      const chunks = [];
      let received = 0;
      const totalHeader = Number(res.headers.get('content-length') || 0);
      let total = totalHeader;
      setBytesTotal(total);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setBytesReceived(received);
        if (total) setProgress(Math.round((received / total) * 100));
      }
      if (total) setProgress(100);
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  const duration = useMemo(() => {
    if (!info?.durationSeconds) return null;
    const s = Number(info.durationSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`;
  }, [info]);

  return (
    <div>
      <div className="container stack-lg" style={{ maxWidth: 720 }}>
        <section className="hero">
          <div className="hero-title">
            <Download />
            <span>Instagram Reels Downloader</span>
          </div>
          <div className="hero-tagline">Paste a public Instagram Reel link and download your video easily.</div>
        </section>

        <section className="card stack">
          <div className="section-title">Paste Link</div>
          <div className="stack">
            <input
              className="input"
              placeholder="https://www.instagram.com/reel/abc..."
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchInfo(); }}
              aria-label="Instagram Reel URL"
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="button" onClick={fetchInfo} disabled={loadingInfo}>
                <Download />
                {loadingInfo ? 'Fetching…' : 'Download'}
              </button>
            </div>
          </div>
          {error ? <div className="error" role="alert">{error}</div> : <div className="helper">Supports public instagram.com reels.</div>}
        </section>

        {loadingInfo && (
          <section className="card">
            <ProgressBar indeterminate />
          </section>
        )}

        {info && (
          <section className="card stack">
            <div className="video">
              <div className="thumb">
                {info.thumbnail ? (
                  <Image src={info.thumbnail} alt="Thumbnail" width={320} height={180} style={{ width: '100%', height: 'auto' }} />
                ) : (
                  <div style={{ aspectRatio: '16/9' }} />
                )}
              </div>
              <div className="meta">
                <div className="title">{info.title || 'Instagram Reel'}</div>
                <div className="muted">{info.author || ''}</div>
                {duration && <div className="muted">Duration: {duration}</div>}
              </div>
            </div>

            <div className="row">
              <button className="button" onClick={startDownload} disabled={downloading}>
                <Download />
                {downloading ? 'Downloading…' : 'Download'}
              </button>
              {downloading && (
                <div style={{ flex: 1 }}>
                  <ProgressBar value={progress} indeterminate={!bytesTotal} />
                  <div className="helper" style={{ marginTop: 6 }}>
                    {bytesTotal
                      ? `${formatBytes(bytesReceived)} / ${formatBytes(bytesTotal)} (${progress}%)`
                      : `${formatBytes(bytesReceived)} downloaded`}
                  </div>
                </div>
              )}
            </div>

            {info.note ? (
              <div className="helper">{info.note}</div>
            ) : null}
          </section>
        )}

<section className="card stack">
          <div className="section-title">Why choose this?</div>
          <ul className="features">
            <li style={{ display: 'flex', alignItems: 'center' }}><CheckCircle style={{ marginRight: 6 }} /> Supports standard instagram.com and reels links.</li>
            <li style={{ display: 'flex', alignItems: 'center' }}><CheckCircle style={{ marginRight: 6 }} /> Fast and easy to use.</li>
            <li style={{ display: 'flex', alignItems: 'center' }}><CheckCircle style={{ marginRight: 6 }} /> Works on desktop and mobile.</li>
          </ul>
        </section>

        <section className="card stack">
          <div className="section-title">How it works</div>
          <div className="steps">
            <div className="step">
              <div className="step-index">1</div>
              <div>
                <div className="step-title">Paste your link</div>
                <div className="step-desc">Copy a public Instagram Reel URL and paste it above.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-index">2</div>
              <div>
                <div className="step-title">Fetch and preview</div>
                <div className="step-desc">We resolve the direct media URL for the reel.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-index">3</div>
              <div>
                <div className="step-title">Download instantly</div>
                <div className="step-desc">Click Download and track progress in real-time.</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> — No ads. For personal use only.
          <br />
          <a href="https://kaifsportfoliosite.web.app/" target="_blank" rel="noopener noreferrer">Click here to visit my portfolio</a>
        </footer>
      </div>
    </div>
  );
}
