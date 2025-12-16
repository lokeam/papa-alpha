/**
 * Generates a unique storage path for uploaded files
 * Format: uploads/{timestamp}-{randomId}-{sanitizedFilename}
 *
 * @param filename - Original filename from user upload
 * @returns Sanitized storage path safe for use in file systems
 *
 * @example
 * generateStoragePath('SOME RPF CONTRACT (Final).pdf')
 * // Returns: 'uploads/1702684800000-abc123-some_rpf_contract_final_.pdf'
 */
export function generateStoragePath(filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const sanitizedFilename = sanitizeFilename(filename);

  return `uploads/${timestamp}-${randomId}-${sanitizedFilename}`;
}

/**
 * Sanitizes a filename to be safe for file systems and URLs
 * - Removes special characters and path separators
 * - Replaces spaces and unsafe chars with underscores
 * - Converts to lowercase for consistency
 * - Prevents path traversal attacks
 *
 * @param filename - Original filename to sanitize
 * @returns Sanitized filename safe for storage
 *
 * @example
 * sanitizeFilename('My Document (v2).pdf')
 * // Returns: 'my_document_v2_.pdf'
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace special chars with underscore
    .replace(/_{2,}/g, '_')             // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')            // Remove leading/trailing underscores
    .toLowerCase();                     // Lowercase for consistency
}
