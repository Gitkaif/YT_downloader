"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ProgressBar from "./ProgressBar";
import { Download, CheckCircle } from "./Icons";

export default function FacebookClient() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [info, setInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloading, setDownloading] = useState(false);
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
      return u.hostname.includes("facebook.com") || u.hostname.includes("fb.watch");
    } catch {
      return false;
    }
  };

  async function fetchInfo() {
    setError("");
    setInfo(null);
    setSelectedFormat(null);
    if (!isValidUrl(url)) {
      setError("Please enter a valid Facebook video URL.");
      return;
    }
    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/facebook/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video info");
      setInfo(data);
      // Select the highest quality format by default
      const bestFormat = data.formats[0];
      setSelectedFormat(bestFormat);
      
      // Update URL with the current video URL
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
    return h > 0 
      ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` 
      : `${m}:${sec.toString().padStart(2, "0")}`;
  }, [info]);

  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

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
    setBytesReceived(0);
    setBytesTotal(0);
    setDownloading(true);
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    
    try {
      const currentUrl = url;
      const qs = new URLSearchParams({ 
        url: currentUrl,
        quality: selectedFormat?.qualityLabel || 'best'
      });

      // Clear input and URL param immediately after click
      setUrl("");
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('url');
        history.replaceState(null, '', u);
      } catch {}

      const res = await fetch(`/api/facebook/download?${qs.toString()}`, { 
        signal: ctrl.signal, 
        cache: 'no-store' 
      });

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
      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;
      setBytesTotal(total);

      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setBytesReceived(received);
        if (total) {
          const progress = Math.round((received / total) * 100);
          // Update progress more frequently for better UX
          if (progress % 5 === 0 || received === total) {
            setProgress(progress);
          }
        }
      }

      if (total) setProgress(100);
      
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const link = document.createElement('a');
      const title = info.title ? info.title.replace(/[^\w\s-]/gi, '') : 'facebook-video';
      const filename = `${title}.mp4`;
      
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Download error:', e);
        setError(e.message);
      }
    } finally {
      setDownloading(false);
    }
  }

  const progress = useMemo(() => {
    if (!bytesTotal) return 0;
    return Math.round((bytesReceived / bytesTotal) * 100);
  }, [bytesReceived, bytesTotal]);

  return (
    <div>
      <div className="container stack-lg" style={{ maxWidth: 720 }}>
        <section className="hero">
          <div className="hero-title">
            <Download />
            <span>Facebook Video Downloader</span>
          </div>
          <div className="hero-tagline">Paste a Facebook video link and download it easily.</div>
        </section>

        <section className="card stack">
          <div className="section-title">Paste Link</div>
          <div className="stack">
            <input
              className="input"
              placeholder="https://www.facebook.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchInfo(); }}
              aria-label="Facebook video URL"
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button 
                className="button" 
                onClick={fetchInfo} 
                disabled={loadingInfo || downloading}
              >
                <Download />
                {loadingInfo ? 'Fetching…' : 'Download'}
              </button>
            </div>
          </div>
          {error ? (
            <div className="error" role="alert">{error}</div>
          ) : (
            <div className="helper">Supports facebook.com and fb.watch links.</div>
          )}
        </section>

        {info && (
          <section className="card stack">
            <div className="section-title">
              {info.title || 'Facebook Video'}
            </div>
            
            <div className="video-preview">
              {thumbUrl && (
                <div className="thumbnail-container">
                  <Image
                    src={thumbUrl}
                    alt="Video thumbnail"
                    width={640}
                    height={360}
                    className="thumbnail"
                    unoptimized
                  />
                  {duration && <div className="duration-badge">{duration}</div>}
                </div>
              )}
              
              <div className="video-info">
                {info.author && (
                  <div className="info-row">
                    <span className="info-label">Author:</span>
                    <span className="info-value">{info.author}</span>
                  </div>
                )}
                
                {info.durationSeconds && (
                  <div className="info-row">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">{duration}</span>
                  </div>
                )}
                
                {selectedFormat && (
                  <div className="info-row">
                    <span className="info-label">Quality:</span>
                    <select
                      className="quality-select"
                      value={selectedFormat.itag}
                      onChange={(e) => {
                        const format = info.formats.find(f => f.itag === e.target.value);
                        if (format) setSelectedFormat(format);
                      }}
                      disabled={downloading}
                    >
                      {info.formats.map((format) => (
                        <option key={format.itag} value={format.itag}>
                          {format.qualityLabel || 'Unknown'}
                          {format.contentLength ? ` (${formatBytes(format.contentLength)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="download-section">
                <button
                  className="button download-button"
                  onClick={handleDownload}
                  disabled={!selectedFormat || downloading}
                >
                  {downloading ? (
                    <>
                      <span className="spinner"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download />
                      Download Video
                    </>
                  )}
                </button>
                
                {downloading && (
                  <div className="progress-container">
                    <ProgressBar value={progress} max={100} />
                    <div className="progress-details">
                      <span>{progress}%</span>
                      <span>
                        {formatBytes(bytesReceived)} of {bytesTotal ? formatBytes(bytesTotal) : '?'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
      
      <style jsx>{`
        .video-preview {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .thumbnail-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f0f0f0;
        }
        
        .thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .duration-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .video-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.5rem 0;
        }
        
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .info-label {
          font-weight: 600;
          color: #555;
          min-width: 80px;
        }
        
        .info-value {
          flex: 1;
          word-break: break-word;
        }
        
        .quality-select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
          font-size: 0.95rem;
          width: 100%;
          max-width: 300px;
        }
        
        .download-section {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .download-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
        }
        
        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .progress-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #666;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
