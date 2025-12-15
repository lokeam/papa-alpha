
export function DashboardTitle({
  title,
  filename,
  pageCount,
  completedAt
}: {
  title: string;
  filename: string;
  pageCount: number;
  completedAt: Date;
}) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-2 mb-8">
      <h1 className="text-3xl font-bold text-black dark:text-white">
        {title}
      </h1>
      <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-zinc-400">
        <p>
          <span className="font-medium">Analyzed:</span> {filename} ({pageCount} pages)
        </p>
        <p>
          <span className="font-medium">Completed:</span> {formatDate(completedAt)} at {formatTime(completedAt)}
        </p>
      </div>
    </div>
  );
}
