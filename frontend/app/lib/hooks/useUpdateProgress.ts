import { useEffect, useState, useCallback } from 'react';

export interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  timestamp: string;
  error?: boolean;
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
        try {
          const data: ProgressUpdate = JSON.parse(event.data);

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
        } catch (err) {
          console.error('Failed to parse progress update:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
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