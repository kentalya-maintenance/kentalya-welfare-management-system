
export const instant = false;

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import WorkSchedulesClient from './work-schedules-client';

export default async function WorkSchedulesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const canCreateSchedules = hasPermission(
    session.role,
    PERMISSIONS.CREATE_WORK_SCHEDULES,
  );

  return (
    <WorkSchedulesClient
      username={session.username}
      role={session.role}
      canCreateSchedules={canCreateSchedules}
    />
  );
}
