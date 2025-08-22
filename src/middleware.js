import { NextResponse } from 'next/server';

export function middleware(request) {
  // Skip API routes in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Block direct access to API routes in production
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse('API route not available in static export', { status: 404 });
  }

  return NextResponse.next();
}

// Only run middleware on API routes
export const config = {
  matcher: ['/api/:path*'],
};
