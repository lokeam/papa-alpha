import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/app/lib/services/document-service';
import { handleApiError } from '@/app/lib/utils/error-handler';
import { getLogger, withRequestContext } from '@/app/lib/logger';

export const POST = withRequestContext(
  { route: '/api/upload' },
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      const documentService = new DocumentService();
      const result = await documentService.uploadAndQueue(file);

      return NextResponse.json(result);
    } catch (error) {
      getLogger().error({ err: error }, 'upload failed');
      return handleApiError(error);
    }
  },
);
