import { describe, it, expect } from 'vitest';
import { getLogger, withRequestContext } from '@/app/lib/logger';

describe('getLogger', () => {
  it('returns the root logger when called outside a request context', () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    // Root logger has no per-request bindings
    expect(logger.bindings()).not.toHaveProperty('requestId');
  });

  it('returns a child logger bound to requestId and route inside a request context', async () => {
    const handler = withRequestContext({ route: '/api/test' }, async () => {
      const logger = getLogger();
      const bindings = logger.bindings();
      expect(bindings.requestId).toBeTypeOf('string');
      expect(bindings.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(bindings.route).toBe('/api/test');
      return new Response('ok');
    });

    await handler();
  });
});

describe('withRequestContext', () => {
  it('sets x-request-id header on the response', async () => {
    const handler = withRequestContext({ route: '/api/test' }, async () => {
      return new Response('ok');
    });

    const response = await handler();
    const requestId = response.headers.get('x-request-id');
    expect(requestId).toBeTypeOf('string');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates a fresh requestId per call', async () => {
    const handler = withRequestContext({ route: '/api/test' }, async () => {
      return new Response('ok');
    });

    const r1 = await handler();
    const r2 = await handler();
    expect(r1.headers.get('x-request-id')).not.toBe(r2.headers.get('x-request-id'));
  });

  it('passes handler arguments through unchanged', async () => {
    const handler = withRequestContext(
      { route: '/api/echo' },
      async (a: number, b: string) => {
        return new Response(JSON.stringify({ a, b }));
      },
    );

    const response = await handler(7, 'hello');
    expect(await response.json()).toEqual({ a: 7, b: 'hello' });
  });
});
