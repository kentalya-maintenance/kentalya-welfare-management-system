
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  employeeSupervisorAssignments,
  safetyReports,
  safetyCorrectiveActions,
} from '@/db/schema';

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const VALID_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;

type ActionStatus = (typeof VALID_STATUSES)[number];

async function canAccessReport(
  reportId: number,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
) {
  const [report] = await db
    .select()
    .from(safetyReports)
    .where(eq(safetyReports.id, reportId))
    .limit(1);

  if (!report) return false;

  if (
    hasPermission(session.role, PERMISSIONS.VIEW_ALL_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS)
  ) {
    return true;
  }

  if (
    hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS)
  ) {
    if (report.reportedByUserId === session.userId) return true;
    if (!session.employeeId) return false;

    const supervised = await db
      .select({
        employeeId: employeeSupervisorAssignments.employeeId,
      })
      .from(employeeSupervisorAssignments)
      .where(
        eq(
          employeeSupervisorAssignments.supervisorEmployeeId,
          session.employeeId,
        ),
      );

    const employeeIds = supervised.map((item) => item.employeeId);

    return (
      (report.reportedByEmployeeId !== null &&
        employeeIds.includes(report.reportedByEmployeeId)) ||
      (report.assignedToEmployeeId !== null &&
        employeeIds.includes(report.assignedToEmployeeId))
    );
  }

  if (
    hasPermission(session.role, PERMISSIONS.VIEW_OWN_SAFETY_REPORTS)
  ) {
    return (
      report.reportedByUserId === session.userId ||
      (session.employeeId !== null &&
        report.reportedByEmployeeId === session.employeeId)
    );
  }

  return false;
}

// ============================================================
// PATCH /api/safety-reports/actions/status
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised.' },
        { status: 401 },
      );
    }

    if (
      !hasPermission(
        session.role,
        PERMISSIONS.UPDATE_CORRECTIVE_ACTION_STATUS,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to update corrective actions.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const actionId = Number(body.actionId);
    const status = String(body.status || '') as ActionStatus;
    const completionNotes =
      body.completionNotes === undefined ||
      body.completionNotes === null
        ? undefined
        : String(body.completionNotes).trim();

    if (!Number.isSafeInteger(actionId) || actionId <= 0) {
      return NextResponse.json(
        { success: false, message: 'A valid action ID is required.' },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid corrective action status.' },
        { status: 400 },
      );
    }

    const [action] = await db
      .select()
      .from(safetyCorrectiveActions)
      .where(eq(safetyCorrectiveActions.id, actionId))
      .limit(1);

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Corrective action not found.' },
        { status: 404 },
      );
    }

    const accessible = await canAccessReport(action.reportId, session);

    if (!accessible) {
      return NextResponse.json(
        { success: false, message: 'Access to this safety report is denied.' },
        { status: 403 },
      );
    }

    if (status === 'completed' && !completionNotes) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide completion notes before marking the action as completed.',
        },
        { status: 400 },
      );
    }

    await db
      .update(safetyCorrectiveActions)
      .set({
        status,
        ...(completionNotes !== undefined
          ? { completionNotes: completionNotes || null }
          : {}),
        completedAt: status === 'completed' ? new Date() : null,
      })
      .where(eq(safetyCorrectiveActions.id, actionId));

    return NextResponse.json({
      success: true,
      message: 'Corrective action updated successfully.',
      actionId,
      status,
    });
  } catch (error) {
    console.error(
      '[PATCH /api/safety-reports/actions/status] error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update corrective action.',
      },
      { status: 500 },
    );
  }
}
