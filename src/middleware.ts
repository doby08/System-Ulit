/**
 * Edge middleware: protects every /admin route and /api/admin endpoint.
 * Public respondent routes (/respond, /api/public) stay open by design.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function getSecretBytes() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  return new TextEncoder().encode('aiis-development-only-secret-key-change-me');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('aiis_session')?.value;
  if (token) {
    try {
      const { jwtVerify } = await import('jose');
      await jwtVerify(token, getSecretBytes(), { issuer: 'aiis', audience: 'aiis-admin' });
      return NextResponse.next();
    } catch {
      // invalid / expired: fall through to redirect
    }
  }
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required.', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};