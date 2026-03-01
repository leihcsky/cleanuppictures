'use client';

import {useEffect} from 'react';

type Props = {
  error: Error;
  reset(): void;
};

export default function Error({error, reset}: Props) {

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 text-xl font-bold text-red-500">Something went wrong!</div>
      <div className="mb-6 max-w-lg rounded bg-slate-100 p-4 text-left text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="font-mono">{error.message}</p>
        {process.env.NODE_ENV === 'development' && error.stack && (
          <pre className="mt-2 overflow-auto text-xs opacity-70">{error.stack}</pre>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
