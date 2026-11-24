"use client";

import "./globals.css";

/** Last-resort boundary for errors in the root layout itself. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center p-6 font-sans">
        <div role="alert" className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">Vitalis hit an unexpected error</h1>
          <p className="text-sm text-muted-foreground">Your data is safe. Try reloading the page.</p>
          <button type="button" onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
