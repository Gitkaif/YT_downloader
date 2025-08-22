// src/app/api/reels/info/route.js
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
    return NextResponse.json(
      { success: false, error: 'Invalid Reel URL. Please provide a valid Instagram Reel URL.' },
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await instagramGetUrl(url);
    const media = Array.isArray(data?.media_details) ? data.media_details : [];
    const video = media.find((m) => m?.type === 'video') || media[0] || null;

    const ownerUser = data?.post_info?.owner_username || null;
    const ownerName = data?.post_info?.owner_fullname || null;
    const thumb = video?.thumbnail || null;
    const title = ownerUser ? `${ownerUser} Reel` : 'Instagram Reel';
    const suggestedBase = sanitize(ownerUser || ownerName || 'reel') || 'reel';
    const suggestedFilename = `${suggestedBase}.mp4`;

    return NextResponse.json({
      success: true,
      platform: 'instagram',
      title,
      author: ownerName || ownerUser || null,
      durationSeconds: null,
      thumbnail: thumb,
      directUrl: video?.url || null,
      suggestedFilename,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reel information' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}