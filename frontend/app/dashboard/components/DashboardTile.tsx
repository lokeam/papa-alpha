
export function DashboardTitle({
  title,
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
      <h1 className="text-3xl font-bold text-foreground">
        {title}
      </h1>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Analysis Completion Date:</span> {formatDate(completedAt)} at {formatTime(completedAt)}
        </p>
      </div>
    </div>
  );
}
