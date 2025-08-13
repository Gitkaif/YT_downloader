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
    const media = Array.isArray(data?.media_details) ? data.media_details : [];
    const video = media.find((m) => m?.type === 'video') || media[0] || null;
    const directUrl = video?.url;
    if (!directUrl) {
      return NextResponse.json({ error: 'Unable to resolve direct reel URL.' }, { status: 404 });
    }

    // Build a nice filename
    const ownerUser = data?.post_info?.owner_username || null;
    const ownerName = data?.post_info?.owner_fullname || null;
    const base = sanitize(ownerUser || ownerName || 'reel') || 'reel';
    const filename = `${base}.mp4`;

    // Proxy stream the file to client so we can set headers and avoid CORS.
    const upstream = await fetch(directUrl, { headers: { 'accept': '*/*' } });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to fetch reel media.', status: upstream.status, detail: text.slice(0, 500) }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        ...(contentLength ? { 'content-length': contentLength } : {}),
        'content-disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Reels download failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
