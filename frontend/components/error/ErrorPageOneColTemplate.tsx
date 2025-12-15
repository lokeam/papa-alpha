import React from 'react';

interface ErrorPageOneColTemplateProps {
  title: string;
  subtext?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export const ErrorPageColTemplate: React.FC<ErrorPageOneColTemplateProps> = ({
  title,
  subtext,
  buttonText = 'Back to Home',
  onButtonClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center px-4">
      <h1 className="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">404</h1>
      <h3 className="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">{title}</h3>
      {subtext && (
        <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">{subtext}</p>
      )}
      <button
        className="inline-flex text-white bg-primary-600 hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-primary-900 my-4"
        onClick={onButtonClick}
      >
        {buttonText}
      </button>
    </div>
  );
};
