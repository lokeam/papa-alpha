import { NextResponse } from 'next/server';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
};

export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class QueueError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'QueueError';
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error: ', error);

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof StorageError) {
    return NextResponse.json(
      { error: 'Failed to upload file to storage' },
      { status: 500 }
    );
  }

  if (error instanceof DatabaseError) {
    return NextResponse.json(
      { error: 'Failed to save document record' },
      { status: 500 }
    );
  }

  if (error instanceof QueueError) {
    return NextResponse.json(
      { error: 'Failed to queue analysis job' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
