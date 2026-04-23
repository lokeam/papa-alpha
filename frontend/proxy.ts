import { NextRequest, NextResponse } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

function parseAllowedOrigins(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map(normalizeOrigin),
  );
}

export function proxy(request: NextRequest): NextResponse {
  if (!STATE_CHANGING_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const requestOrigin = request.headers.get('origin');
  const expectedOrigin = request.nextUrl.origin;
  const allowed = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  if (requestOrigin) {
    const normalized = normalizeOrigin(requestOrigin);
    if (normalized === expectedOrigin || allowed.has(normalized)) {
      return NextResponse.next();
    }
  }

  return NextResponse.json(
    { error: 'Cross-origin request rejected' },
    { status: 403 },
  );
}

export const config = {
  matcher: '/api/:path*',
};
