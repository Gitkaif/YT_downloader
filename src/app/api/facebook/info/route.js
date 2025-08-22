// Force static export
// This route will be pre-rendered at build time
export const dynamic = 'force-static';
export const revalidate = 86400; // Revalidate every 24 hours

import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { URL as NodeURL } from 'url';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !(url.includes('facebook.com') || url.includes('fb.watch'))) {
    return NextResponse.json({ error: 'Invalid Facebook URL.' }, { status: 400 });
  }

  try {
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

    // Use a custom fetch with more headers to avoid blocking
    const html = await fetchWithFullHeaders(url);

    // Log HTML length for debugging
    console.log('Fetched HTML length:', html.length);

    // Try multiple patterns to extract video URLs
    let hdUrl = null;
    let sdUrl = null;

    // Pattern 1: Standard JSON format
    const hdMatch1 = html.match(/"playable_url_quality_hd":"([^"]+)"/);
    const sdMatch1 = html.match(/"playable_url":"([^"]+)"/);

    // Pattern 2: Alternative format sometimes used
    const hdMatch2 = html.match(/playable_url_quality_hd:\"([^\"]+)\"/);
    const sdMatch2 = html.match(/playable_url:\"([^\"]+)\"/);

    // Pattern 3: HTML5 video source
    const videoSourceMatch = html.match(/<video[^>]+src="([^"]+)"/);

    // Pattern 4: Meta property og:video:url
    const ogVideoMatch = html.match(/property="og:video:url" content="([^"]+)"/);

    // Pattern 5: Any MP4 URL in the page
    const mp4UrlMatches = html.match(/https:\/\/[^"'\s]+\.mp4[^"'\s]*/g);

    // Pattern 6: Any video CDN URL in the page
    const videoCdnMatches = html.match(/https:\/\/video[^"'\s]+/g);

    // Extract from any successful match
    if (hdMatch1 && hdMatch1[1]) {
      hdUrl = hdMatch1[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%');
    } else if (hdMatch2 && hdMatch2[1]) {
      hdUrl = hdMatch2[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%');
    }

    if (sdMatch1 && sdMatch1[1]) {
      sdUrl = sdMatch1[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%');
    } else if (sdMatch2 && sdMatch2[1]) {
      sdUrl = sdMatch2[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%');
    } else if (videoSourceMatch && videoSourceMatch[1]) {
      sdUrl = videoSourceMatch[1];
    } else if (ogVideoMatch && ogVideoMatch[1]) {
      sdUrl = ogVideoMatch[1];
    }

    // Fallback: Use MP4 URLs found in the page
    if (!hdUrl && !sdUrl && mp4UrlMatches && mp4UrlMatches.length > 0) {
      sdUrl = mp4UrlMatches[0];
      if (mp4UrlMatches.length > 1) {
        hdUrl = mp4UrlMatches[1];
      }
    }

    // Fallback: Use video CDN URLs found in the page
    if (!hdUrl && !sdUrl && videoCdnMatches && videoCdnMatches.length > 0) {
      sdUrl = videoCdnMatches[0];
      if (videoCdnMatches.length > 1) {
        hdUrl = videoCdnMatches[1];
      }
    }

    if (!hdUrl && !sdUrl) {
      // Log a larger snippet of the HTML for debugging
      console.error('HTML snippet:', html.slice(0, 1000));
      throw new Error('Could not find video URLs in the Facebook page. The video might be private, restricted, or Facebook changed their markup.');
    }
    
    // Extract title with multiple patterns
    let title = 'Facebook Video';
    const titlePatterns = [
      /"name":"([^"]+)"/,
      /<title>([^<]+)<\/title>/,
      /og:title" content="([^"]+)"/
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }
    
    // Extract thumbnail
    let thumbnail = null;
    const thumbnailPatterns = [
      /"thumbnailImage":\{"uri":"([^"]+)"/,
      /og:image" content="([^"]+)"/
    ];
    
    for (const pattern of thumbnailPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        thumbnail = match[1].replace(/\\\//g, '/');
        break;
      }
    }
    
    // If we couldn't find any URLs, try a fallback approach
    if (!hdUrl && !sdUrl) {
      // Look for any MP4 URLs in the page
      const mp4UrlMatches = html.match(/https:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
      if (mp4UrlMatches && mp4UrlMatches.length > 0) {
        // Use the first match as SD
        sdUrl = mp4UrlMatches[0];
        // If there's more than one, use the second as HD
        if (mp4UrlMatches.length > 1) {
          hdUrl = mp4UrlMatches[1];
        }
      }
    }
    
    if (!hdUrl && !sdUrl) {
      throw new Error('Could not find video URLs in the Facebook page. The video might be private or restricted.');
    }
    
    const formats = [];
    
    if (hdUrl) {
      formats.push({
        itag: 'fb_hd',
        container: 'mp4',
        qualityLabel: 'HD',
        hasVideo: true,
        hasAudio: true,
        url: hdUrl,
        contentLength: null,
        mimeType: 'video/mp4',
      });
    }
    
    if (sdUrl) {
      formats.push({
        itag: 'fb_sd',
        container: 'mp4',
        qualityLabel: 'SD',
        hasVideo: true,
        hasAudio: true,
        url: sdUrl,
        contentLength: null,
        mimeType: 'video/mp4',
      });
    }
    
    // Extract video ID from URL
    let id = 'unknown';
    const idMatch = url.match(/[?&]v=([^&]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }

    return NextResponse.json({
      id,
      title,
      author: null,
      durationSeconds: 0,
      thumbnail,
      formats,
    });
  } catch (err) {
    console.error('FACEBOOK_INFO_ERROR', err);
    const message = err?.message || 'Failed to fetch Facebook video info.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to fetch with full browser-like headers
async function fetchWithFullHeaders(url) {
  return new Promise((resolve, reject) => {
    // Parse the URL to determine if we need http or https
    const parsedUrl = new NodeURL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      }
    };

    const req = protocol.request(options, (res) => {
      // Handle redirects (status codes 301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow the redirect
        const redirectUrl = new NodeURL(res.headers.location, url).toString();
        console.log(`Following redirect to: ${redirectUrl}`);
        fetchWithFullHeaders(redirectUrl).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch Facebook page: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}
