// src/app/api/reels/info/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Changed from 'nodejs' to 'edge' for better compatibility

import { NextResponse } from 'next/server';
import { instagramGetUrl } from 'instagram-url-direct';
import sanitize from 'sanitize-filename';

// Helper function to create consistent JSON responses
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
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
    return jsonResponse(
      { success: false, error: 'Invalid Reel URL. Please provide a valid Instagram Reel URL.' },
      400
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

    return jsonResponse({
      success: true,
      platform: 'instagram',
      title,
      author: ownerName || ownerUser || null,
      durationSeconds: null,
      thumbnail: thumb,
      directUrl: video?.url || null,
      suggestedFilename,
    });
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: error.message || 'Failed to fetch reel information',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      500
    );
  }
}