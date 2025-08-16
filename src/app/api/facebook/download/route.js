import { NextResponse } from 'next/server';
import { FacebookScraper } from 'fb-downloader-scraper';
import { PassThrough } from 'stream';
import { promisify } from 'util';
import sanitize from 'sanitize-filename';

const pipeline = promisify(require('stream').pipeline);

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
    // Initialize the scraper
    const scraper = new FacebookScraper();
    
    // Get video info using fb-downloader-scraper
    const info = await scraper.getVideoInfo(url).catch(err => {
      console.error('Error getting video info:', err);
      throw new Error('Failed to fetch video information. The video may be private or the URL may be invalid.');
    });

    if (!info || !info.streams || info.streams.length === 0) {
      throw new Error('No playable formats found for this video');
    }

    // Get the requested format or the best one by default
    let selectedFormat;
    if (itag) {
      selectedFormat = info.streams[parseInt(itag.replace('fb_', ''))];
    }
    
    // If no specific format requested or not found, get the first one
    if (!selectedFormat) {
      selectedFormat = info.streams[0];
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

    // Create a pass-through stream
    const stream = new PassThrough();
    
    // Start streaming the response
    (async () => {
      try {
        if (videoResponse.body) {
          for await (const chunk of videoResponse.body) {
            if (signal.aborted) break;
            stream.write(chunk);
          }
          stream.end();
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Stream error:', err);
          stream.destroy(err);
        }
      }
    })();

    // Return the streamed response
    return new Response(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': contentDispositionFor(cleanTitle, 'mp4'),
        'Content-Length': selectedFormat.contentLength ? selectedFormat.contentLength.toString() : '',
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
