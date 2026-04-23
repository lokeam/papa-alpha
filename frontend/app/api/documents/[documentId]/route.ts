import { NextRequest, NextResponse } from 'next/server';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { handleApiError } from '@/app/lib/utils/error-handler';
import { getLogger, withRequestContext } from '@/app/lib/logger';

export const GET = withRequestContext(
  { route: '/api/documents/[documentId]' },
  async (
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
  ) => {
    try {
      const { documentId } = await params;
      const repository = new DocumentRepository();
      const document = await repository.findById(documentId);

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(document);
    } catch (error) {
      getLogger().error({ err: error }, 'failed to fetch document');
      return handleApiError(error);
    }
  },
);
