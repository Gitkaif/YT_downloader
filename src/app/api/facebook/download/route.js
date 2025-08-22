// This route should not be statically exported as it handles dynamic requests
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fbDownloader from 'fb-downloader';
import sanitize from 'sanitize-filename';

function contentDispositionFor(filenameBase, extension) {
  const base = sanitize(filenameBase || 'video').replace(/[\r\n]/g, ' ').trim() || 'video';
  // Fallback ASCII-only filename (no control chars, no non-ASCII)
  const ascii = base
    .replace(/[\x00-\x1F\x7F-\uFFFF]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
  const fallback = `${ascii || 'facebook-video'}.${extension}`;
  const utf8Name = encodeURIComponent(`${base}.${extension}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${utf8Name}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { signal } = request;
  const url = searchParams.get('url');
  const itag = searchParams.get('itag');

  // Validate the URL first - check for Facebook video URL patterns
  const fbVideoPatterns = [
    /https?:\/\/(www\.)?facebook\.com\/.+\/videos\/.+/i,
    /https?:\/\/(www\.)?facebook\.com\/watch\/?\?v=.+/i,
    /https?:\/\/(www\.)?facebook\.com\/share\/v\/.+/i,
    /https?:\/\/(www\.)?fb\.watch\/.+/i,
  ];

  const isValidUrl = fbVideoPatterns.some(pattern => pattern.test(url));
  if (!isValidUrl) {
    return NextResponse.json({ error: 'Please enter a valid Facebook video URL.' }, { status: 400 });
  }

  try {
    // Get video info using fb-downloader
    const info = await fbDownloader(url);

    if (!info || !info.download || info.download.length === 0) {
      throw new Error('No playable formats found for this video');
    }

    // Get the requested format or the best one by default
    let selectedFormat;
    if (itag) {
      const index = parseInt(itag.replace('fb_', ''));
      if (index >= 0 && index < info.download.length) {
        selectedFormat = info.download[index];
      }
    }
    
    // If no specific format requested or not found, get the first one (highest quality)
    if (!selectedFormat && info.download.length > 0) {
      selectedFormat = info.download[0];
    }

    if (!selectedFormat || !selectedFormat.url) {
      throw new Error('No playable format found for this video');
    }

    // Create a clean title for the filename
    const cleanTitle = info.title 
      ? info.title.replace(/[^\w\s-]/gi, '').trim()
      : 'facebook-video';
    
    // Create a response with the video stream
    const videoResponse = await fetch(selectedFormat.url, { 
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.facebook.com/',
        'Origin': 'https://www.facebook.com',
      }
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    // Return the streamed response
    return new Response(videoResponse.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': contentDispositionFor(cleanTitle, 'mp4'),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error('FACEBOOK_DOWNLOAD_ERROR', err);
    const message = err?.message || 'Failed to download Facebook video.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

