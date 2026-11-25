
import { Suspense } from 'react';
import NewSafetyReportForm from './new-safety-report-form';

export default function NewSafetyReportPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">
              Loading safety report form...
            </p>
          </div>
        </main>
      }
    >
      <NewSafetyReportForm />
    </Suspense>
  );
}
