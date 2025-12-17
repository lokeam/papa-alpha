import { NextResponse } from 'next/server';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { handleApiError } from '@/app/lib/utils/error-handler';

export interface ActiveJobResponse {
  documentId: string | null;
  status: 'pending' | 'processing' | null;
  filename: string | null;
}

export async function GET() {
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
    return handleApiError(error);
  }
}