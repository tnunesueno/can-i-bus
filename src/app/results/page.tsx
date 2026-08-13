import { Suspense } from "react";
import { ResultsClient } from "@/components/ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full items-center justify-center text-stone-500">
          Loading…
        </main>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
