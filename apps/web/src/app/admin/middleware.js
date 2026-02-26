import { NextResponse } from 'next/server';
import { isOwnerBusiness } from '@/lib/entitlements';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get the authorization token
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                request.cookies.get('token')?.value;

  if (!token) {
    // Redirect to login for web requests, return 401 for API requests
    if (pathname.startsWith('/admin/api')) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // For API routes, let the route handlers handle authentication
  if (pathname.startsWith('/admin/api')) {
    return NextResponse.next();
  }

  // For page routes, we'll handle auth client-side
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
