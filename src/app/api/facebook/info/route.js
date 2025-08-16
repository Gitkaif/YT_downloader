export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { FacebookScraper } from 'fb-downloader-scraper';

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

    // Map streams to a consistent structure
    const formats = info.streams.map((stream, index) => ({
      itag: `fb_${index}`,
      container: 'mp4',
      qualityLabel: stream.quality || 'HD',
      hasVideo: true,
      hasAudio: stream.hasAudio !== false,
      url: stream.url,
      contentLength: stream.size ? parseInt(stream.size) : null,
      mimeType: stream.mimeType || 'video/mp4',
    }));

    // Sort by quality (best first)
    formats.sort((a, b) => {
      const aQuality = parseInt(a.qualityLabel) || 0;
      const bQuality = parseInt(b.qualityLabel) || 0;
      return bQuality - aQuality;
    });

    return NextResponse.json({
      id: info.id || 'unknown',
      title: info.title || 'Facebook Video',
      author: info.author || null,
      durationSeconds: info.duration || 0,
      thumbnail: info.thumbnail || null,
      formats,
    });
  } catch (err) {
    console.error('FACEBOOK_INFO_ERROR', err);
    const message = err?.message || 'Failed to fetch Facebook video info.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
