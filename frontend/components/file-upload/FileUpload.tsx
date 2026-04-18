"use client";

import React, { useRef, useState } from "react";

// Dependencies
import { motion } from "motion/react";
import { useDropzone } from "react-dropzone";
import { useTheme } from "next-themes";
import { cn } from "@/components/ui/utils";
import { MAX_UPLOAD_FILE_SIZE } from "@/app/lib/config";

// Icons
import { FileUploadIcon } from "@/components/ui/icons/FileUploadIcon";
import { PDFIcon } from "@/components/ui/icons/PDFIcon";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
    borderColor: 'rgba(220, 38, 38, 0)',
  },
  animate: {
    opacity: 1,
    borderColor: 'rgba(220, 38, 38, 1)',
  },
};

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const handleFileChange = (newFiles: File[]) => {
    // Clear previous error
    setError(null);

    // Validate file
    const fileToUpload = newFiles[0];
    if (!fileToUpload) return;

    const validationError = handleValidateFile(fileToUpload);
    if (validationError) {
      setError(validationError);
      setFiles([]);

      return;
    }

    // Else file is valid; carry on
    setFiles([fileToUpload]);
    onChange?.([fileToUpload]);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleValidateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return 'File size exceeds 50MB limit';
    }

    return null;
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setError(null);
    onChange?.([]);

    // Reset file input so same file may be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: handleFileChange,
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className={cn(
          "p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden z-20",
          error && "ring-2 ring-red-500 dark:ring-red-600"
        )}
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-base">
            {files.length > 0 ? 'File Selected' : 'Upload file'}
          </p>
          <p className="relative z-20 font-sans font-normal text-neutral-400 dark:text-neutral-400 text-base mt-2">
            {files.length > 0
              ? 'Please verify that this is the file you intend to upload before continuing'
              : 'Drag or drop your files here or click to upload'
            }
          </p>
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative overflow-hidden z-30 bg-card flex flex-col items-start justify-start md:h-24 p-4 pr-12 mt-4 w-full mx-auto rounded-md",
                    "shadow-2xl border-2"
                  )}
                  style={{ borderColor: 'hsl(var(--card-border))' }}
                >
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Remove file"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-muted-foreground"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Main content: Icon + File Info */}
                  <div className="flex items-center gap-4 w-full">
                    {/* PDF Icon */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0"
                    >
                      <PDFIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </motion.div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      {/* Filename and Size */}
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-base font-medium text-foreground truncate"
                        >
                          {file.name}
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-muted-foreground shrink-0"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </motion.p>
                      </div>

                      {/* Modified Date */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-muted-foreground"
                      >
                        Last Modified {new Date(file.lastModified).toLocaleDateString()}
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <div className="relative h-32 mt-4 w-full max-w-32 mx-auto">
                <motion.div
                  layoutId="file-upload"
                  variants={mainVariant}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative z-30 bg-card flex items-center justify-center h-full w-full rounded-md"
                  style={{
                    boxShadow: isHovered
                      ? (theme === 'dark'
                        ? '0 20px 25px -5px rgba(185, 28, 28, 0.4), 0 8px 10px -6px rgba(185, 28, 28, 0.3)'
                        : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)')
                      : (theme === 'dark'
                        ? '0px 10px 50px rgba(185, 28, 28, 0.15)'
                        : '0px 10px 50px rgba(0,0,0,0.1)'),
                    transition: 'box-shadow 550ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {isDragActive ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-muted-foreground flex flex-col items-center"
                    >
                      Drop it
                      <FileUploadIcon className="h-10 w-10 text-muted-foreground mt-2" />
                    </motion.p>
                  ) : (
                    <FileUploadIcon className="h-10 w-10 text-muted-foreground mt-2" />
                  )}
                </motion.div>


                <motion.div
                  initial="initial"
                  animate={isDragActive ? "animate" : "initial"}
                  variants={secondaryVariant}
                  className="absolute border border-dashed inset-0 z-0 bg-transparent rounded-md pointer-events-none"
                ></motion.div>
              </div>
            )}
            {/* End upload area */}

            {/* Error message display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {error}
                </p>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-gray-100 dark:bg-neutral-900 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
