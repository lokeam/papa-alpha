import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/app/lib/services/document-service';
import { handleApiError } from '@/app/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate input
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Call all business logic
    const documentService = new DocumentService();
    const result = await documentService.uploadAndQueue(file);

    // Return response payload
    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error);
  }
}
