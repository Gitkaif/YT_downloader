// This route should not be statically exported as it handles dynamic downloads
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import sanitize from 'sanitize-filename';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// On Windows in Next's output, ffmpeg-static path can resolve to a packed file under node_modules.
// Avoid setting a path inside .next; prefer the absolute path from ffmpeg-static if available.
try {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
} catch {}

const COMMON_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};

function contentDispositionFor(filenameBase, extension) {
  const base = sanitize(filenameBase || 'video').replace(/[\r\n]/g, ' ').trim() || 'video';
  // Fallback ASCII-only filename (no control chars, no non-ASCII)
  const ascii = base
    .replace(/[\x00-\x1F\x7F-\uFFFF]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
  const fallback = `${ascii || 'video'}.${extension}`;
  const utf8Name = encodeURIComponent(`${base}.${extension}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${utf8Name}`;
}

// Streaming downloads: MP4 via ytdl, MP3 via ffmpeg pipe
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { signal } = request;
  const url = searchParams.get('url');
  const itag = searchParams.get('itag');
  const format = (searchParams.get('format') || 'mp4').toLowerCase(); // mp4|mp3

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL.' }, { status: 400 });
  }
  try {
    const info = await ytdl.getInfo(url, { requestOptions: { headers: COMMON_HEADERS } });
    const title = sanitize(info.videoDetails.title || 'video');

    if (format === 'mp3') {
      // Pick a playable format with robust fallbacks to avoid "No playable formats found"
      let chosen;
      const tryPick = (opts) => {
        try { return ytdl.chooseFormat(info.formats, opts); } catch { return null; }
      };
      chosen = tryPick({ filter: 'audioonly', quality: 'highestaudio' })
        || tryPick({ filter: 'audioonly', quality: 'lowestaudio' })
        || tryPick({ filter: (f) => f.hasAudio, quality: 'highest' })
        || tryPick({ quality: 'highest' });

      if (!chosen) {
        throw new Error('No playable formats found');
      }

      const input = ytdl.downloadFromInfo(info, {
        format: chosen,
        highWaterMark: 1 << 25,
        requestOptions: { headers: COMMON_HEADERS },
      });

      const stream = new ReadableStream({
        start(controller) {
          const command = ffmpeg(input)
            .audioCodec('libmp3lame')
            .format('mp3')
            .on('error', (err) => controller.error(err))
            .on('end', () => controller.close())
            .pipe();

          const onAbort = () => {
            try { command.destroy?.(); } catch {}
            try { input.destroy(); } catch {}
            controller.close();
          };
          signal?.addEventListener('abort', onAbort, { once: true });

          command.on('data', (chunk) => controller.enqueue(chunk));
          command.on('end', () => controller.close());
          command.on('error', (err) => controller.error(err));
        },
        cancel() {
          try { input.destroy(); } catch {}
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': contentDispositionFor(title, 'mp3'),
          'Cache-Control': 'no-store',
          'Connection': 'keep-alive',
        },
      });
    }

    // default: mp4, honor specific itag when provided
    const options = itag ? { quality: Number(itag) } : { quality: 'highest' };
    const video = ytdl(url, { ...options, highWaterMark: 1 << 25, requestOptions: { headers: COMMON_HEADERS } });

    // Note: content length is not always available; also guard against never firing
    const contentLength = await new Promise((resolve) => {
      let settled = false;
      const onResponse = (res) => {
        if (settled) return;
        settled = true;
        resolve(Number(res.headers['content-length'] || 0));
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        resolve(0);
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        resolve(0);
      };
      video.once('response', onResponse);
      video.once('error', onError);
      signal?.addEventListener('abort', onAbort, { once: true });
      setTimeout(() => { if (!settled) { settled = true; resolve(0); } }, 2000);
    });

    const stream = new ReadableStream({
      start(controller) {
        const onAbort = () => {
          try { video.destroy(); } catch {}
          controller.close();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        video.on('data', (chunk) => controller.enqueue(chunk));
        video.on('end', () => controller.close());
        video.on('error', (err) => controller.error(err));
      },
      cancel() {
        try { video.destroy(); } catch {}
      },
    });

    const headers = {
      'Content-Type': 'video/mp4',
      'Content-Disposition': contentDispositionFor(title, 'mp4'),
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    };
    if (contentLength) headers['Content-Length'] = String(contentLength);

    return new Response(stream, { headers });
  } catch (err) {
    // Map client abort/connection reset to a non-error status
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.code || err?.cause?.code;
    if (msg.includes('aborted') || msg.includes('abort') || code === 'ECONNRESET') {
      return new Response(null, { status: 499 });
    }
    console.error('DOWNLOAD_ERROR', err);
    const message = err?.message || 'Download failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


