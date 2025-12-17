import { NextResponse } from 'next/server';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { handleApiError } from '@/app/lib/utils/error-handler';

const documentRepository = new DocumentRepository();

/**
 * GET /api/documents/latest
 * Fetch the most recent completed document with analysis results
 */
export async function GET() {
  try {
    console.log('[API /documents/latest] Fetching latest completed document...');
    const document = await documentRepository.findLatestCompleted();
    console.log('[API /documents/latest] Result:', document ? `Found: ${document.id}` : 'No document found');

    if (!document) {
      console.log('[API /documents/latest] No completed documents in database');
      return NextResponse.json(
        { error: 'No completed documents found' },
        { status: 404 }
      );
    }

    console.log('[API /documents/latest] Returning document:', document.filename);
    return NextResponse.json(document);
  } catch (error) {
    console.error('[API /documents/latest] Error:', error);
    return handleApiError(error);
  }
}