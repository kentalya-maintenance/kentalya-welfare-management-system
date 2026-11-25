
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import JobCardApprovalsClient from './job-card-approvals-client';

async function JobCardApprovalsContent() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const canVerify = hasPermission(
    session.role,
    PERMISSIONS.VERIFY_JOB_CARDS,
  );

  const canApprove = hasPermission(
    session.role,
    PERMISSIONS.APPROVE_JOB_CARDS,
  );

  if (!canVerify && !canApprove) {
    redirect('/dashboard');
  }

  return (
    <JobCardApprovalsClient
      role={session.role}
      username={session.username}
      canVerify={canVerify}
      canApprove={canApprove}
    />
  );
}

function JobCardApprovalsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
        <p className="text-sm text-gray-500">
          Loading Job Card Approvals...
        </p>
      </div>
    </main>
  );
}

export default function JobCardApprovalsPage() {
  return (
    <Suspense fallback={<JobCardApprovalsLoading />}>
      <JobCardApprovalsContent />
    </Suspense>
  );
}
