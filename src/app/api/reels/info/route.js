// This route should not be statically exported as it handles dynamic requests
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { instagramGetUrl } from 'instagram-url-direct';
import sanitize from 'sanitize-filename';

// Set response headers
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, max-age=0',
};

function isReelUrl(u) {
  try {
    const url = new URL(u);
    return (
      url.hostname.includes('instagram.com') ||
      url.hostname.includes('facebook.com') ||
      url.pathname.includes('/reel')
    );
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !isReelUrl(url)) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid Reel URL. Please provide a valid Instagram Reel URL.' }), 
      { status: 400, headers }
    );
  }
  try {
    const data = await instagramGetUrl(url);
    // data: { results_number, post_info, url_list, media_details: [{type, url, thumbnail, dimensions, video_view_count}] }
    const media = Array.isArray(data?.media_details) ? data.media_details : [];
    // Prefer a video entry if present (Reels)
    const video = media.find((m) => m?.type === 'video') || media[0] || null;

    const ownerUser = data?.post_info?.owner_username || null;
    const ownerName = data?.post_info?.owner_fullname || null;
    const thumb = video?.thumbnail || null;
    const title = ownerUser ? `${ownerUser} Reel` : 'Instagram Reel';
    const suggestedBase = sanitize(ownerUser || ownerName || 'reel') || 'reel';
    const suggestedFilename = `${suggestedBase}.mp4`;

    return new NextResponse(
      JSON.stringify({
        success: true,
        platform: 'instagram',
        title,
        author: ownerName || ownerUser || null,
        durationSeconds: null,
        thumbnail: thumb,
        directUrl: video?.url || null,
        suggestedFilename,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reel info:', error);
    return new NextResponse(
      JSON.stringify({ 
        success: false,
        error: 'Failed to fetch reel information. Please try again.' 
      }),
      { status: 500, headers }
    );
  }
}
