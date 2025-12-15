'use client';

import React from 'react';

interface ErrorPageTwoColTemplateProps {
  title: string;
  subtext?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  image?: React.ReactNode;
  children?: React.ReactNode;
}

export const ErrorPageTwoColTemplate: React.FC<ErrorPageTwoColTemplateProps> = ({
  title,
  subtext,
  buttonText = 'Reload',
  onButtonClick,
  image,
  children,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-background text-foreground px-4">
      <div className="flex-1 flex flex-col justify-center items-start max-w-xl py-12">
        <h4 className="text-xl font-semibold text-primary-600 dark:text-primary-500 mb-2">500 Internal Error</h4>
        <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-white mb-4">{title}</h2>
        {subtext && (
          <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">{subtext}</p>
        )}
        {children && (
          <div className="mb-4">{children}</div>
        )}
        <button
          className="inline-flex text-white bg-primary-600 hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-primary-900 my-4"
          onClick={onButtonClick}
        >
          {buttonText}
        </button>
      </div>
      {image && (
        <div className="flex-1 flex justify-center items-center max-w-xl py-12">
          {image}
        </div>
      )}
    </div>
  );
};
