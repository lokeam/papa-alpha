import { useEffect, useState } from 'react';

export interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  timestamp: string;
  error?: boolean;
}

function isProgressUpdate(value: unknown): value is ProgressUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.step === 'string' &&
    typeof v.progress === 'number' &&
    typeof v.message === 'string'
  );
}

export function useUpdateProgress(documentId: string | null) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource(`/api/progress/${documentId}`);

      eventSource.onmessage = (event) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!isProgressUpdate(parsed)) return;
        const data = parsed;

        setProgress(data.progress);
        setCurrentStep(data.message);

        if (data.step === 'completed') {
          setIsComplete(true);
          eventSource?.close();
        }

        if (data.step === 'error' || data.error) {
          setError(data.message);
          eventSource?.close();
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [documentId]);

  return { progress, currentStep, isComplete, error };
}