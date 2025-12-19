
import Link from 'next/link';

// Icons
import { FileUploadIcon } from '@/components/ui/icons/FileUploadIcon';

export function DashboardFooter() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      {/* Secondary Button - Analyze Another */}
      <Link
        href="/"
        className="w-full sm:w-auto px-6 py-3 bg-card hover:bg-muted text-foreground font-medium rounded-lg border transition-colors duration-200 flex items-center justify-center gap-2" style={{ borderColor: 'hsl(var(--border))' }}>
        <FileUploadIcon className="w-4 h-4" />
        Analyze Another Document
      </Link>
    </div>
  );
}
