
import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

function isRestrictedRole(role: string) {
  const normalizedRole = role
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

  return (
    normalizedRole.includes('supervisor') ||
    [
      'head_of_department',
      'hod',
      'department_head',
    ].includes(normalizedRole)
  );
}

async function JobCardsAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (isRestrictedRole(session.role)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}

export default function JobCardsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm font-medium text-slate-600">
            Checking access...
          </p>
        </main>
      }
    >
      <JobCardsAccessGuard>{children}</JobCardsAccessGuard>
    </Suspense>
  );
}
