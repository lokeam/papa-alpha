import { NextResponse } from 'next/server';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { handleApiError } from '@/app/lib/utils/error-handler';
import { getLogger, withRequestContext } from '@/app/lib/logger';

export interface ActiveJobResponse {
  documentId: string | null;
  status: 'pending' | 'processing' | null;
  filename: string | null;
}

export const GET = withRequestContext(
  { route: '/api/documents/active' },
  async () => {
    try {
      const repository = new DocumentRepository();
      const activeJob = await repository.findActiveJob();

      if (!activeJob) {
        return NextResponse.json({
          documentId: null,
          status: null,
          filename: null,
        } as ActiveJobResponse);
      }

      return NextResponse.json({
        documentId: activeJob.id,
        status: activeJob.status,
        filename: activeJob.filename,
      } as ActiveJobResponse);
    } catch (error) {
      getLogger().error({ err: error }, 'failed to fetch active job');
      return handleApiError(error);
    }
  },
);
