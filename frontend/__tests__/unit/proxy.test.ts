import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

function makeRequest(opts: {
  method: string;
  url: string;
  origin?: string;
}): NextRequest {
  const headers = new Headers();
  if (opts.origin !== undefined) {
    headers.set('origin', opts.origin);
  }
  return new NextRequest(opts.url, { method: opts.method, headers });
}

describe('proxy — same-origin enforcement', () => {
  const originalAllowed = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalAllowed === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = originalAllowed;
    }
  });

  it('returns 403 for state-changing API request with mismatched origin', async () => {
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
      origin: 'http://evil.example.com',
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 403 when origin header is missing for state-changing API request', async () => {
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])(
    'returns 403 for %s with mismatched origin',
    async (method) => {
      const req = makeRequest({
        method,
        url: 'http://localhost:3000/api/upload',
        origin: 'http://evil.example.com',
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    },
  );

  it('passes through matching same-origin POST', async () => {
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
      origin: 'http://localhost:3000',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBeTruthy();
  });

  it('passes through GET requests regardless of origin', async () => {
    const req = makeRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/documents/latest',
      origin: 'http://evil.example.com',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBeTruthy();
  });

  it('passes through GET to SSE progress route with no origin', async () => {
    const req = makeRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/progress/abc',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBeTruthy();
  });

  it('allows cross-origin POST when origin is in ALLOWED_ORIGINS', async () => {
    process.env.ALLOWED_ORIGINS = 'http://trusted.example.com,http://other.com';
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
      origin: 'http://trusted.example.com',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBeTruthy();
  });

  it('rejects cross-origin POST not in ALLOWED_ORIGINS', async () => {
    process.env.ALLOWED_ORIGINS = 'http://trusted.example.com';
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
      origin: 'http://untrusted.example.com',
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it('tolerates whitespace and trailing slashes in ALLOWED_ORIGINS entries', async () => {
    process.env.ALLOWED_ORIGINS = '  http://trusted.example.com/  , http://other.com';
    const req = makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/upload',
      origin: 'http://trusted.example.com',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBeTruthy();
  });
});
