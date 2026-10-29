"use client";

import { Alert, Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <Alert tone="error" title="Something went wrong" role="alert">
        <p>{error.digest ? "The page could not be loaded. Please try again." : error.message}</p>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
