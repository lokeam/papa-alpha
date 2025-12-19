'use client';

import { BulbIcon } from "@/components/ui/icons/BulbIcon";

type TipBoxProps = {
  message: string;
};

export function TipBox({ message }: TipBoxProps) {
  return (
    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
      <div className="text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
        <BulbIcon className="w-8 h-8 text-yellow-500" /> <span className="font-medium">Tip:</span> {message}
      </div>
    </div>
  );
}