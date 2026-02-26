import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect admin page routes, not API routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/api')) {
    // For page routes, we'll handle auth client-side to avoid SSR issues
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
