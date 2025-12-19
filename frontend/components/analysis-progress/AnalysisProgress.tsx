'use client';

import React from 'react';
import { motion } from 'motion/react';

// Types
export type StepStatus = 'pending' | 'processing' | 'complete' | 'error';

export type AnalysisStep = {
  name: string;
  label: string;
  status: StepStatus;
  progress: number; // 0-100
  result?: string;
};

export type Analysis = {
  id: string;
  filename: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  steps: AnalysisStep[];
  estimatedTimeRemaining?: number; // seconds
};

// Progress Bar Component
const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full bg-sky-500 dark:bg-sky-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: 0.5,
          ease: "easeOut"
        }}
      />
    </div>
  );
};

// Individual Step Component
const AnalysisStepItem = ({ step }: { step: AnalysisStep }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'complete':
        return (
          <span className="text-green-500 dark:text-green-400 text-sm">✓</span>
        );
      case 'processing':
        return (
          <motion.span
            className="text-sky-500 dark:text-sky-400 text-sm"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            ⚙️
          </motion.span>
        );
      case 'pending':
        return <span className="text-gray-400 dark:text-neutral-600 text-sm">⏳</span>;
      case 'error':
        return <span className="text-red-500 dark:text-red-400 text-sm">✗</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center">
          {getStatusIcon()}
        </div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {step.label}
        </p>
      </div>

      <div className="ml-9 space-y-1">
        <div className="flex items-center gap-3">
          <ProgressBar progress={step.progress} />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 min-w-12 text-right">
            {step.progress}%
          </span>
        </div>

        {step.result && step.status === 'complete' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {step.result}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

// Main Component
export const AnalysisProgress = ({ analysis }: { analysis: Analysis }) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-black overflow-hidden">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Hazel AI Scope Review
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-8">
          {/* Filename */}
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Analyzing:</p>
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-1">
              {analysis.filename}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {analysis.steps.map((step) => (
              <AnalysisStepItem key={step.name} step={step} />
            ))}
          </div>

          {/* Time Estimate */}
          {analysis.estimatedTimeRemaining !== undefined &&
           analysis.status === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-4 border-t border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Estimated time remaining:{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatTime(analysis.estimatedTimeRemaining)}
                </span>
              </p>
            </motion.div>
          )}

          {/* Complete State */}
          {analysis.status === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center pt-4 border-t border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ✓ Analysis Complete
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock data for testing
export const mockAnalysis: Analysis = {
  id: 'abc123',
  filename: 'IT-Services-RFP-2025.pdf',
  status: 'analyzing',
  steps: [
    {
      name: 'extract_text',
      label: 'Extracting document text',
      status: 'complete',
      progress: 100,
      result: 'Complete'
    },
    {
      name: 'small_business',
      label: 'Analyzing small business access',
      status: 'complete',
      progress: 100,
      result: 'Score: 3/10'
    },
    {
      name: 'compliance',
      label: 'Identifying compliance risks',
      status: 'complete',
      progress: 100,
      result: 'Found 11 issues'
    },
    {
      name: 'questions',
      label: 'Generating clarifying questions',
      status: 'processing',
      progress: 45,
    },
    {
      name: 'subcontracting',
      label: 'Analyzing subcontracting opportunities',
      status: 'processing',
      progress: 15,
    }
  ],
  estimatedTimeRemaining: 30
};