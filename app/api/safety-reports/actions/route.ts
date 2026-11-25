
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, or } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  employeeSupervisorAssignments,
  safetyReports,
  safetyCorrectiveActions,
} from '@/db/schema';

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// ============================================================
// CHECK WHETHER A USER CAN ACCESS A SAFETY REPORT
// ============================================================

async function getAccessibleReport(
  reportId: number,
  session: Awaited<ReturnType<typeof getSession>>,
) {
  if (!session) {
    return null;
  }

  const [report] = await db
    .select()
    .from(safetyReports)
    .where(eq(safetyReports.id, reportId))
    .limit(1);

  if (!report) {
    return null;
  }

  // ADMINISTRATOR, DIRECTOR AND HEAD OF DEPARTMENT
  if (
    hasPermission(session.role, PERMISSIONS.VIEW_ALL_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS)
  ) {
    return report;
  }

  // SUPERVISOR
  if (
    hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS)
  ) {
    if (report.reportedByUserId === session.userId) {
      return report;
    }

    if (!session.employeeId) {
      return null;
    }

    const supervisedEmployees = await db
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

    const employeeIds = supervisedEmployees.map(
      (item) => item.employeeId,
    );

    if (employeeIds.length === 0) {
      return null;
    }

    if (
      (report.reportedByEmployeeId !== null &&
        employeeIds.includes(report.reportedByEmployeeId)) ||
      (report.assignedToEmployeeId !== null &&
        employeeIds.includes(report.assignedToEmployeeId))
    ) {
      return report;
    }

    return null;
  }

  // WELFARE STAFF
  if (
    hasPermission(session.role, PERMISSIONS.VIEW_OWN_SAFETY_REPORTS)
  ) {
    if (report.reportedByUserId === session.userId) {
      return report;
    }

    if (
      session.employeeId &&
      report.reportedByEmployeeId === session.employeeId
    ) {
      return report;
    }
  }

  return null;
}

// ============================================================
// GET /api/safety-reports/actions?reportId=1
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised.' },
        { status: 401 },
      );
    }

    const reportId = Number(
      request.nextUrl.searchParams.get('reportId'),
    );

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      return NextResponse.json(
        { success: false, message: 'A valid report ID is required.' },
        { status: 400 },
      );
    }

    const report = await getAccessibleReport(reportId, session);

    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Safety report not found or access denied.' },
        { status: 404 },
      );
    }

    const actions = await db
      .select({
        action: safetyCorrectiveActions,
        employee: {
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
        },
      })
      .from(safetyCorrectiveActions)
      .leftJoin(
        employees,
        eq(
          safetyCorrectiveActions.assignedToEmployeeId,
          employees.id,
        ),
      )
      .where(eq(safetyCorrectiveActions.reportId, reportId))
      .orderBy(desc(safetyCorrectiveActions.createdAt));

    return NextResponse.json({
      success: true,
      actions: actions.map((item) => ({
        ...item.action,
        employee: item.employee,
      })),
    });
  } catch (error) {
    console.error('[GET /api/safety-reports/actions] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to retrieve corrective actions.' },
      { status: 500 },
    );
  }
}

// ============================================================
// POST /api/safety-reports/actions
// Create a corrective action.
// ============================================================

export async function POST(request: NextRequest) {
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
        PERMISSIONS.MANAGE_CORRECTIVE_ACTIONS,
      )
    ) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to manage corrective actions.' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const reportId = Number(body.reportId);
    const actionDescription = String(
      body.actionDescription || '',
    ).trim();

    if (
      !Number.isSafeInteger(reportId) ||
      reportId <= 0 ||
      !actionDescription
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid report ID and action description are required.',
        },
        { status: 400 },
      );
    }

    // Verify that the user can access and manage this report.
    const report = await getAccessibleReport(reportId, session);

    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Safety report not found or access denied.' },
        { status: 404 },
      );
    }

    const assignedToEmployeeId =
      body.assignedToEmployeeId === null ||
      body.assignedToEmployeeId === undefined ||
      body.assignedToEmployeeId === ''
        ? null
        : Number(body.assignedToEmployeeId);

    if (
      assignedToEmployeeId !== null &&
      (!Number.isSafeInteger(assignedToEmployeeId) ||
        assignedToEmployeeId <= 0)
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid assigned employee.' },
        { status: 400 },
      );
    }

    // Validate the assigned employee.
    if (assignedToEmployeeId !== null) {
      const [employee] = await db
        .select({
          id: employees.id,
          status: employees.status,
          department: employees.department,
        })
        .from(employees)
        .where(eq(employees.id, assignedToEmployeeId))
        .limit(1);

      if (
        !employee ||
        employee.status !== 'active' ||
        employee.department !== 'Welfare'
      ) {
        return NextResponse.json(
          { success: false, message: 'Only active Welfare employees can be assigned corrective actions.' },
          { status: 400 },
        );
      }

      // Supervisors may only assign their own supervised employees.
      if (
        hasPermission(
          session.role,
          PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS,
        )
      ) {
        if (!session.employeeId) {
          return NextResponse.json(
            { success: false, message: 'Your account is not linked to an employee record.' },
            { status: 403 },
          );
        }

        const permitted = await db
          .select({
            employeeId: employeeSupervisorAssignments.employeeId,
          })
          .from(employeeSupervisorAssignments)
          .where(
            and(
              eq(
                employeeSupervisorAssignments.supervisorEmployeeId,
                session.employeeId,
              ),
              eq(
                employeeSupervisorAssignments.employeeId,
                assignedToEmployeeId,
              ),
            ),
          )
          .limit(1);

        if (permitted.length === 0) {
          return NextResponse.json(
            { success: false, message: 'You can only assign actions to employees under your supervision.' },
            { status: 403 },
          );
        }
      }
    }

    // Validate optional due date.
    let dueDate: Date | null = null;

    if (body.dueDate) {
      const dueDateString = String(body.dueDate).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateString)) {
        return NextResponse.json(
          { success: false, message: 'Invalid due date.' },
          { status: 400 },
        );
      }

      const [year, month, day] = dueDateString.split('-').map(Number);
      dueDate = new Date(year, month - 1, day);

      if (
        dueDate.getFullYear() !== year ||
        dueDate.getMonth() !== month - 1 ||
        dueDate.getDate() !== day
      ) {
        return NextResponse.json(
          { success: false, message: 'Please enter a valid due date.' },
          { status: 400 },
        );
      }
    }

    const inserted = await db
      .insert(safetyCorrectiveActions)
      .values({
        reportId,
        actionDescription,
        assignedToEmployeeId,
        dueDate,
        status: 'pending',
        createdBy: session.userId,
      })
      .$returningId();

    const actionId = inserted[0]?.id;

    if (!actionId) {
      throw new Error('The corrective action could not be created.');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Corrective action created successfully.',
        actionId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/safety-reports/actions] error:', error);

    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'Failed to create corrective action.';

    return NextResponse.json(
      {
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' &&
        error instanceof Error
          ? { stack: error.stack }
          : {}),
      },
      { status: 500 },
    );
  }
}
