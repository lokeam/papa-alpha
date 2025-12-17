import { NextRequest } from 'next/server';
import Redis from 'ioredis';

const LOCAL_REDIS_URL = 'redis://localhost:6379';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  // Create Redis clients
  const redis = new Redis(process.env.REDIS_URL || LOCAL_REDIS_URL);
  const subscriber = redis.duplicate();

  const channel = `progress:${documentId}`;

  // Set up SSE stream
  const encoder = new TextEncoder();
  let isClosed = false;

  const cleanup = () => {
    if (!isClosed) {
      isClosed = true;
      subscriber.quit();
      redis.quit();
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Redis channel
      await subscriber.subscribe(channel);

      // Handle incoming messages
      subscriber.on('message', (ch, message) => {
        if (ch === channel && !isClosed) {
          // Send SSE message
          const data = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Check if job is complete or error
          try {
            const parsed = JSON.parse(message);
            if (parsed.step === 'completed' || parsed.step === 'error') {
              // Close stream after completion
              setTimeout(() => {
                if (!isClosed) {
                  cleanup();
                  controller.close();
                }
              }, 100);
            }
          } catch (e) {
            console.error('Failed to parse progress message:', e);
          }
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch (e) {
          // Controller already closed, ignore
          console.error('Failed to close controller:', e);
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}