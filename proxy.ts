import { boundedBody, HttpError } from '@/lib/security';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
  if (
    request.method === 'POST' &&
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    // Enforce bounds before the framework's progressive-form parser sees multipart input.
    const limit =
      request.nextUrl.pathname === '/api/admin/upload'
        ? 5300000
        : request.nextUrl.pathname === '/api/contact'
          ? 30000
          : 2000000;
    try {
      const cloned = request.clone();
      const bytes = await boundedBody(cloned, limit);
      const type = request.headers.get('content-type') || '';
      if (type.includes('multipart/form-data')) {
        try {
          await new Response(bytes, {
            headers: { 'Content-Type': type },
          }).formData();
        } catch {
          throw new HttpError(400, 'Invalid form data.');
        }
      }
    } catch (e) {
      void request.body?.cancel().catch(() => {});
      return Response.json(
        { error: e instanceof HttpError ? e.message : 'Invalid request body.' },
        {
          status: e instanceof HttpError ? e.status : 400,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        },
      );
    }
  }
  const response = NextResponse.next();
  const dev = process.env.NODE_ENV !== 'production';
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' ${dev ? 'ws:' : ''}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; worker-src 'self' blob:`,
  );
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')
  ) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  if (!dev)
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
