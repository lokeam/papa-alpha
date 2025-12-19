import { cn } from '@/components/ui/utils';

type AskteriskIconProps = {
  className?: string;
};

export function AskteriskIcon({ className }: AskteriskIconProps) {
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
      className={cn("icon icon-tabler icons-tabler-outline icon-tabler-asterisk", className)}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 12l8 -4.5" />
      <path d="M12 12v9" />
      <path d="M12 12l-8 -4.5" />
      <path d="M12 12l8 4.5" />
      <path d="M12 3v9" />
      <path d="M12 12l-8 4.5" />
    </svg>
  );
}
