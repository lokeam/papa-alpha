import { Redis } from 'ioredis';
import { QueueError } from '@/app/lib/utils/error-handler';
import { REDIS_URL } from '@/app/lib/config';

export interface AnalysisJob {
  documentId: string;
  storagePath: string;
  filename: string;
}

export class QueueAdapter {
  private client: Redis;

  constructor() {
    this.client = new Redis(REDIS_URL);
  }

  async push(queue: string, job: AnalysisJob): Promise<void> {
    try {
      await this.client.lpush(queue, JSON.stringify(job));
    } catch (error) {
      throw new QueueError('Failed to push job to queue', error);
    }
  }

  async pop(queue: string): Promise<AnalysisJob | null> {
    try {
      const result = await this.client.brpop(queue, 0);

      return result ? JSON.parse(result[1]) : null;
    } catch (error) {
      throw new QueueError('Failed to pop job from queue', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
