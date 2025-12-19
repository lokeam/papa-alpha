import { cn } from '@/components/ui/utils';

type FileDownloadIconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function FileDownloadIcon({ className, style }: FileDownloadIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("icon icon-tabler icons-tabler-outline icon-tabler-file-download", className)}
      style={style}
    >
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
      <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
      <path d="M12 18v-6"/>
      <path d="m9 15 3 3 3-3"/>
    </svg>
  );
}
