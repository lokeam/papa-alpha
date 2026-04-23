import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import pino, { type Logger } from 'pino';

interface RequestContext {
  requestId: string;
  route: string;
  logger: Logger;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

const rootLogger: Logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

export function getLogger(): Logger {
  return requestContext.getStore()?.logger ?? rootLogger;
}

export interface RequestContextOptions {
  route: string;
}

export function withRequestContext<TArgs extends unknown[]>(
  options: RequestContextOptions,
  handler: (...args: TArgs) => Promise<Response> | Response,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs): Promise<Response> => {
    const requestId = randomUUID();
    const ctx: RequestContext = {
      requestId,
      route: options.route,
      logger: rootLogger.child({ requestId, route: options.route }),
    };
    return requestContext.run(ctx, async () => {
      const response = await handler(...args);
      response.headers.set('x-request-id', requestId);
      return response;
    });
  };
}
