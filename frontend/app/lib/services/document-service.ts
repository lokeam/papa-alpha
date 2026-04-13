import { StorageAdapter } from '@/app/lib/adapters/storage-adapter';
import { QueueAdapter } from '@/app/lib/adapters/queue-adapter';
import { DocumentRepository } from '@/app/lib/repositories/document-repository';
import { ValidationError, QueueError } from '@/app/lib/utils/error-handler';
import { generateStoragePath } from '@/app/lib/utils/storage';


export interface UploadResult {
  success: boolean;
  documentId: string;
  filename: string;
  status: string;
}

// Allow max pdf size of 50MB
const MAX_SIZE = 50 * 1024 * 1024;

export class DocumentService {
  private storage: StorageAdapter;
  private repository: DocumentRepository;
  private queue: QueueAdapter;

  constructor(
    storage?: StorageAdapter,
    repository?: DocumentRepository,
    queue?: QueueAdapter
  ) {
    // Note: temporarily allowing dependency injection for the sake of testing
    this.storage = storage || new StorageAdapter();
    this.repository = repository || new DocumentRepository();
    this.queue = queue || new QueueAdapter();
  }

  async uploadAndQueue(file: File): Promise<UploadResult> {
    // 1. Validate file type
    if (file.type !== 'application/pdf') {
      throw new ValidationError('Only PDF files are allowed');
    }

    // 2. Validate file size (50MB limit)
    if (file.size > MAX_SIZE) {
      throw new ValidationError('File size must be less than 50MB');
    }

    // 3. Generate storage path with sanitized filename
    const storagePath = generateStoragePath(file.name);

    // 4. Upload to storage
    await this.storage.upload(storagePath, file);

    // 5. Create database record
    let document;
    try {
      document = await this.repository.create({
        filename: file.name,
        storage_path: storagePath,
        status: 'pending',
      });
    } catch (error) {
      // Rollback: delete uploaded file
      await this.storage.delete(storagePath).catch(console.error);
      throw error;
    }

    // 6. Queue analysis job
    try {
      await this.queue.push('rfp-analysis-queue', {
        documentId: document.id,
        storagePath,
        filename: file.name,
      });
    } catch (error) {
      // Rollback: delete database record and storage object
      await this.repository.delete(document.id).catch(console.error);
      await this.storage.delete(storagePath).catch(console.error);
      throw new QueueError('Analysis queue is temporarily unavailable', error);
    }

    return {
      success: true,
      documentId: document.id,
      filename: file.name,
      status: 'pending',
    };
  }
}
