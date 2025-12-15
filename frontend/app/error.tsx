'use client';

import { useEffect } from 'react';
import { ErrorPageTwoColTemplate } from '@/components/error/ErrorPageTwoColTemplate';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error)
  }, [error]);

  return (
    <ErrorPageTwoColTemplate
      title="Something went wrong!"
      subtext="We encountered an error. Please try again."
      buttonText="Try again"
      onButtonClick={reset}
    />
  );
}
