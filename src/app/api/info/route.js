export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

const COMMON_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL.' }, { status: 400 });
  }
  try {
    const info = await ytdl.getInfo(url, { requestOptions: { headers: COMMON_HEADERS } });
    const videoDetails = info.videoDetails;

    // Consolidate formats
    const formats = info.formats
      .filter((f) => (f.hasVideo || f.hasAudio))
      .map((f) => ({
        itag: f.itag,
        container: f.container,
        qualityLabel: f.qualityLabel || null,
        bitrate: f.bitrate || null,
        audioBitrate: f.audioBitrate || null,
        hasVideo: Boolean(f.hasVideo),
        hasAudio: Boolean(f.hasAudio),
        isLive: Boolean(f.isLive),
        contentLength: f.contentLength ? Number(f.contentLength) : null,
        mimeType: f.mimeType || null,
      }));

    // Choose a best thumbnail
    const thumb = (videoDetails.thumbnails && videoDetails.thumbnails.length)
      ? videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url
      : null;

    const durationSeconds = Number(videoDetails.lengthSeconds || 0);

    return NextResponse.json({
      id: videoDetails.videoId,
      title: videoDetails.title,
      author: videoDetails.author?.name || null,
      durationSeconds,
      thumbnails: videoDetails.thumbnails || [],
      thumbnail: thumb,
      formats,
    });
  } catch (err) {
    console.error('INFO_ERROR', err);
    const message = err?.message || 'Failed to fetch video info.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


