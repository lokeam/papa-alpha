import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/progress/[documentId]/route';

const REDIS_URL = process.env.REDIS_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

async function clientCount(redis: Redis): Promise<number> {
  const list = await redis.client('LIST');
  if (typeof list !== 'string' || list.length === 0) return 0;
  return list.split('\n').filter((l) => l.length > 0).length;
}

async function waitForCount(
  redis: Redis,
  target: number,
  timeoutMs = 2000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let count = await clientCount(redis);
  while (count > target && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
    count = await clientCount(redis);
  }
  return count;
}

describeIfRedis('SSE progress route — subscriber lifecycle', () => {
  let observer: Redis;

  beforeAll(() => {
    observer = new Redis(REDIS_URL!);
  });

  afterAll(async () => {
    await observer.quit();
  });

  it('releases Redis connections after client abort', async () => {
    const baseline = await clientCount(observer);

    const controller = new AbortController();
    const request = new NextRequest(
      'http://localhost/api/progress/test-doc-abort',
      { signal: controller.signal },
    );

    const response = await GET(request, {
      params: Promise.resolve({ documentId: 'test-doc-abort' }),
    });

    // Start consuming so the underlying ReadableStream's start() runs to completion.
    const reader = response.body!.getReader();

    // Allow the route's subscribe() to register before sampling.
    await new Promise((r) => setTimeout(r, 100));
    const duringStream = await clientCount(observer);
    expect(duringStream).toBeGreaterThan(baseline);

    controller.abort();
    try {
      await reader.cancel();
    } catch {
      // expected — abort tears the stream down
    }

    const afterAbort = await waitForCount(observer, baseline);
    expect(afterAbort).toBe(baseline);
  });

  it('releases Redis connections after stream cancel', async () => {
    const baseline = await clientCount(observer);

    const request = new NextRequest(
      'http://localhost/api/progress/test-doc-cancel',
    );

    const response = await GET(request, {
      params: Promise.resolve({ documentId: 'test-doc-cancel' }),
    });

    const reader = response.body!.getReader();
    await new Promise((r) => setTimeout(r, 100));
    expect(await clientCount(observer)).toBeGreaterThan(baseline);

    await reader.cancel();

    const afterCancel = await waitForCount(observer, baseline);
    expect(afterCancel).toBe(baseline);
  });
});
