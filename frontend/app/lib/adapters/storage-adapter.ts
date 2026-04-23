import { createClient } from '@supabase/supabase-js';
import { StorageError } from '@/app/lib/utils/error-handler';

const DOCUMENTS_TABLE = 'documents';
const UNEXPECTED_STORAGE_ERROR_MSG = 'Unexpected storage error';

// Reject any traversal segment so user-controlled inputs cannot escape the
// documents bucket scope.
function assertSafePath(path: string): void {
  if (path.includes('..')) {
    throw new StorageError('Invalid path');
  }
}

export class StorageAdapter {
  private client;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async upload(path: string, file: File): Promise<void> {
    try {
      assertSafePath(path);
      const buffer = await file.arrayBuffer();
      const { error } = await this.client.storage
        .from(DOCUMENTS_TABLE)
        .upload(path, buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw new StorageError('Failed to upload to storage', error);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;

      throw new StorageError(UNEXPECTED_STORAGE_ERROR_MSG, error);
    }
  }


  async delete(path: string): Promise<void> {
    try {
      assertSafePath(path);
      const { error } = await this.client.storage
        .from(DOCUMENTS_TABLE)
        .remove([path]);

      if (error) {
        throw new StorageError('Failed to delete from storage', error);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;

      throw new StorageError(UNEXPECTED_STORAGE_ERROR_MSG, error);
    }
  }

  async getPublicUrl(path: string): Promise<string> {
    assertSafePath(path);
    const { data } = this.client.storage
      .from(DOCUMENTS_TABLE)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
