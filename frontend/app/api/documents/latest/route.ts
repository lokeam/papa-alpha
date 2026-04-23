import { NextResponse } from 'next/server';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { handleApiError } from '@/app/lib/utils/error-handler';
import { getLogger, withRequestContext } from '@/app/lib/logger';

const documentRepository = new DocumentRepository();

export const GET = withRequestContext(
  { route: '/api/documents/latest' },
  async () => {
    const log = getLogger();
    try {
      log.info('fetching latest completed document');
      const document = await documentRepository.findLatestCompleted();

      if (!document) {
        log.info('no completed documents found');
        return NextResponse.json(
          { error: 'No completed documents found' },
          { status: 404 }
        );
      }

      log.info({ documentId: document.id, filename: document.filename }, 'returning latest document');
      return NextResponse.json(document);
    } catch (error) {
      log.error({ err: error }, 'failed to fetch latest document');
      return handleApiError(error);
    }
  },
);
