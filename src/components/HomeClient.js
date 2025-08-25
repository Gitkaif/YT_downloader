"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ProgressBar from "./ProgressBar";
import { Download, CheckCircle } from "./Icons";

export default function HomeClient() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [info, setInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [selectedType, setSelectedType] = useState("mp4");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const controllerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('url');
    if (q) setUrl(q);
  }, []);

  const isValidUrl = (val) => {
    try {
      const u = new URL(val);
      return (
        u.hostname.includes("youtube.com") || u.hostname === "youtu.be"
      );
    } catch {
      return false;
    }
  };

  async function fetchInfo() {
    setError("");
    setInfo(null);
    setSelectedFormat(null);
    if (!isValidUrl(url)) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch info");
      setInfo(data);
      const candidate = data.formats.find((f) => f.container === "mp4" && f.hasVideo && f.hasAudio && f.qualityLabel) || data.formats.find((f) => f.hasAudio && f.hasVideo) || data.formats[0];
      setSelectedFormat(candidate || null);
      const u = new URL(window.location.href);
      u.searchParams.set('url', url);
      history.replaceState(null, '', u);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingInfo(false);
    }
  }

  const thumbUrl = info?.thumbnail || null;
  const duration = useMemo(() => {
    if (!info?.durationSeconds) return null;
    const s = Number(info.durationSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`;
  }, [info]);

  useEffect(() => () => { if (controllerRef.current) controllerRef.current.abort(); }, []);

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 100 || i === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
  }

  async function handleDownload() {
    if (!info || !url) return;
    setError("");
    setProgress(0);
    setBytesReceived(0);
    setBytesTotal(0);
    setDownloading(true);
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    try {
      // Capture current URL before clearing input
      const currentUrl = url;
      const qs = new URLSearchParams({ url: currentUrl, format: selectedType });
      if (selectedFormat?.itag && selectedType === 'mp4') qs.set('itag', String(selectedFormat.itag));
      // Clear input and URL param immediately after click
      setUrl("");
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('url');
        history.replaceState(null, '', u);
      } catch {}
      const res = await fetch(`/api/download?${qs.toString()}`, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 499) {
          throw new Error('Connection interrupted. Please retry.');
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Download failed (HTTP ${res.status})`);
        }
        throw new Error(`Download failed (HTTP ${res.status})`);
      }
      const reader = res.body?.getReader();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `video.${selectedType}`;

      const chunks = [];
      let received = 0;
      const headerLength = Number(res.headers.get('content-length') || 0);
      let total = headerLength;
      if (!total && selectedType === 'mp4') {
        const formatHint = Number(selectedFormat?.contentLength || 0);
        if (formatHint) total = formatHint;
      }
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
      const blob = new Blob(chunks, { type: selectedType === 'mp3' ? 'audio/mpeg' : 'video/mp4' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const videoFormats = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const f of info?.formats || []) {
      if (f && f.hasVideo && f.container === 'mp4' && !seen.has(f.itag)) {
        seen.add(f.itag);
        unique.push(f);
      }
    }
    return unique;
  }, [info]);

  return (
    <div>
      <div className="container stack-lg" style={{ maxWidth: 720 }}>
        <section className="hero">
          <div className="hero-title">
            <Download />
            <span>YouTube video Downloader</span>
          </div>
          <div className="hero-tagline">Paste a YouTube link and download your video easily.</div>
        </section>

        <section className="card stack">
          <div className="section-title">Paste Link</div>
          <div className="stack">
            <input
              className="input"
              placeholder="https://youtube.com/watch?v=abc123"
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchInfo(); }}
              aria-label="YouTube URL"
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="button" onClick={fetchInfo} disabled={loadingInfo}>
                <Download />
                {loadingInfo ? 'Fetching…' : 'Download'}
              </button>
            </div>
          </div>
          {error ? <div className="error" role="alert">{error}</div> : <div className="helper">Supports standard youtube.com and youtu.be links.</div>}
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
                <div className="title">{info.title}</div>
                <div className="muted">{info.author}</div>
                {duration && <div className="muted">Duration: {duration}</div>}
              </div>
            </div>

            <div className="row">
              <label>
                <div className="helper">Type</div>
                <select className="select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option value="mp4">MP4 (video)</option>
                  <option value="mp3">MP3 (audio)</option>
                </select>
              </label>

              {selectedType === 'mp4' && (
                <label>
                  <div className="helper">Quality</div>
                  <select
                    className="select"
                    value={selectedFormat?.itag || ''}
                    onChange={(e) => {
                      const itag = Number(e.target.value);
                      setSelectedFormat(videoFormats.find((f) => f.itag === itag) || null);
                    }}
                  >
                    {videoFormats.map((f) => (
                      <option key={f.itag} value={f.itag}>
                        {f.qualityLabel || 'Unknown'} · {f.container.toUpperCase()} {f.hasAudio ? '+ audio' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="row">
              <button className="button" onClick={handleDownload} disabled={downloading}>
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
          </section>
        )}

<section className="card stack">
          <div className="section-title">Why choose this?</div>
          <ul className="features">
            <li style={{ display: 'flex', alignItems: 'center' }}><CheckCircle style={{ marginRight: 6 }} /> Supports standard youtube.com and youtu.be links.</li>
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
                <div className="step-desc">Copy a YouTube video URL and paste it into the field above.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-index">2</div>
              <div>
                <div className="step-title">Choose format and quality</div>
                <div className="step-desc">Pick MP4 or MP3, and select your preferred video quality.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-index">3</div>
              <div>
                <div className="step-title">Download instantly</div>
                <div className="step-desc">Click Download and we’ll prepare your file with a clean filename.</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> — No ads. For personal use only.
          <br />
          <a
            href="https://kaifsportfoliosite.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontWeight: 'bold',
              color: '#1976d2',
              background: 'rgba(25, 118, 210, 0.08)',
              padding: '4px 10px',
              borderRadius: '6px',
              textDecoration: 'underline',
              display: 'inline-block',
              marginTop: 4
            }}
          >
            <span role="img" aria-label="star" style={{ marginRight: 4 }}>👨‍💻</span>
            Click here to visit my portfolio
          </a>
        </footer>
      </div>
    </div>
  );
}


