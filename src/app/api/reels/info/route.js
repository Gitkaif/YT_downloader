// This route should not be statically exported as it handles dynamic requests
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { instagramGetUrl } from 'instagram-url-direct';
import sanitize from 'sanitize-filename';

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
    return NextResponse.json({ error: 'Invalid Reel URL.' }, { status: 400 });
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

    return NextResponse.json({
      platform: 'instagram',
      title,
      author: ownerName || ownerUser || null,
      durationSeconds: null,
      thumbnail: thumb,
      directUrl: video?.url || null,
      suggestedFilename,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch reel info', detail: String(e?.message || e) }, { status: 500 });
  }
}

