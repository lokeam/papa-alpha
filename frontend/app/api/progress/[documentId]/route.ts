import { NextRequest } from 'next/server';
import Redis from 'ioredis';
import { REDIS_URL } from '@/app/lib/config';
import { getLogger, withRequestContext } from '@/app/lib/logger';

export const GET = withRequestContext(
  { route: '/api/progress/[documentId]' },
  async (
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
  ) => {
    const { documentId } = await params;
    const log = getLogger().child({ documentId });

    const redis = new Redis(REDIS_URL);
    const subscriber = redis.duplicate();

    const channel = `progress:${documentId}`;

    const encoder = new TextEncoder();
    let isClosed = false;

    const cleanup = async (): Promise<void> => {
      if (isClosed) return;
      isClosed = true;
      try {
        await subscriber.quit();
        await redis.quit();
      } catch (err) {
        log.error({ err }, 'sse cleanup failed');
      }
    };

    const stream = new ReadableStream({
      async start(controller) {
        await subscriber.subscribe(channel);

        subscriber.on('message', (ch, message) => {
          if (ch === channel && !isClosed) {
            const data = `data: ${message}\n\n`;
            controller.enqueue(encoder.encode(data));

            try {
              const parsed = JSON.parse(message);
              if (parsed.step === 'completed' || parsed.step === 'error') {
                setTimeout(() => {
                  if (!isClosed) {
                    void cleanup();
                    controller.close();
                  }
                }, 100);
              }
            } catch (e) {
              log.error({ err: e }, 'failed to parse progress message');
            }
          }
        });

        request.signal.addEventListener('abort', () => {
          void cleanup();
          try {
            controller.close();
          } catch (e) {
            log.error({ err: e }, 'failed to close controller');
          }
        });
      },
      cancel() {
        void cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  },
);
