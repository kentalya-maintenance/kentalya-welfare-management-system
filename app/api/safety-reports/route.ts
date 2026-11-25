
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, or } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  employeeSupervisorAssignments,
  safetyReports,
} from '@/db/schema';

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// ============================================================
// GET /api/safety-reports
// Retrieve reports according to the user's permissions.
// ============================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised to view safety reports.' },
        { status: 401 },
      );
    }

    let reports;

    // ADMINISTRATOR, DIRECTOR AND HEAD OF DEPARTMENT
    if (
      hasPermission(session.role, PERMISSIONS.VIEW_ALL_SAFETY_REPORTS) ||
      hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS)
    ) {
      reports = await db
        .select()
        .from(safetyReports)
        .orderBy(desc(safetyReports.reportDate), desc(safetyReports.createdAt));
    }

    // SUPERVISOR
    else if (
      hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS)
    ) {
      const conditions = [];

      // A supervisor can always see reports they personally submitted.
      conditions.push(eq(safetyReports.reportedByUserId, session.userId));

      if (session.employeeId) {
        conditions.push(
          eq(safetyReports.reportedByEmployeeId, session.employeeId),
        );

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

        if (employeeIds.length > 0) {
          conditions.push(
            inArray(safetyReports.reportedByEmployeeId, employeeIds),
          );

          conditions.push(
            inArray(safetyReports.assignedToEmployeeId, employeeIds),
          );
        }
      }

      reports = await db
        .select()
        .from(safetyReports)
        .where(or(...conditions))
        .orderBy(desc(safetyReports.reportDate), desc(safetyReports.createdAt));
    }

    // WELFARE STAFF
    else if (
      hasPermission(session.role, PERMISSIONS.VIEW_OWN_SAFETY_REPORTS)
    ) {
      const conditions = [
        eq(safetyReports.reportedByUserId, session.userId),
      ];

      if (session.employeeId) {
        conditions.push(
          eq(safetyReports.reportedByEmployeeId, session.employeeId),
        );
      }

      reports = await db
        .select()
        .from(safetyReports)
        .where(or(...conditions))
        .orderBy(desc(safetyReports.reportDate), desc(safetyReports.createdAt));
    } else {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view safety reports.' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('[GET /api/safety-reports] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to retrieve safety reports.' },
      { status: 500 },
    );
  }
}

// ============================================================
// POST /api/safety-reports
// Create a new safety or equipment defect report.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised to submit safety reports.' },
        { status: 401 },
      );
    }

    if (!hasPermission(session.role, PERMISSIONS.CREATE_SAFETY_REPORTS)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to submit safety reports.' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const reportDateString = String(body.reportDate || '').trim();
    const reportType = String(body.reportType || '').trim();
    const severity = String(body.severity || 'medium').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();

    const allowedTypes = [
      'hazard',
      'accident',
      'injury',
      'near_miss',
      'equipment_defect',
    ];

    const allowedSeverities = [
      'low',
      'medium',
      'high',
      'critical',
    ];

    if (!reportDateString || !reportType || !title || !description) {
      return NextResponse.json(
        {
          success: false,
          message: 'Report date, report type, title and description are required.',
        },
        { status: 400 },
      );
    }

    if (!allowedTypes.includes(reportType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid safety report category.' },
        { status: 400 },
      );
    }

    if (!allowedSeverities.includes(severity)) {
      return NextResponse.json(
        { success: false, message: 'Invalid report severity.' },
        { status: 400 },
      );
    }

    // Validate date without accepting impossible calendar dates.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDateString)) {
      return NextResponse.json(
        { success: false, message: 'Invalid report date.' },
        { status: 400 },
      );
    }

    const [year, month, day] = reportDateString.split('-').map(Number);
    const reportDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(reportDate.getTime()) ||
      reportDate.getFullYear() !== year ||
      reportDate.getMonth() !== month - 1 ||
      reportDate.getDate() !== day
    ) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid report date.' },
        { status: 400 },
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

    // Only authorised managers can assign investigation responsibility.
    if (
      assignedToEmployeeId !== null &&
      !hasPermission(session.role, PERMISSIONS.ASSIGN_SAFETY_REPORTS)
    ) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to assign safety reports.' },
        { status: 403 },
      );
    }

    // Validate the assigned employee.
    if (assignedToEmployeeId !== null) {
      const [assignedEmployee] = await db
        .select({
          id: employees.id,
          status: employees.status,
          department: employees.department,
        })
        .from(employees)
        .where(eq(employees.id, assignedToEmployeeId))
        .limit(1);

      if (
        !assignedEmployee ||
        assignedEmployee.status !== 'active' ||
        assignedEmployee.department !== 'Welfare'
      ) {
        return NextResponse.json(
          { success: false, message: 'The assigned employee must be an active Welfare employee.' },
          { status: 400 },
        );
      }

      // Supervisors can only assign reports to employees under them.
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

        const permittedAssignment = await db
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

        if (permittedAssignment.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'You can only assign reports to employees under your supervision.',
            },
            { status: 403 },
          );
        }
      }
    }

    const farm = String(body.farm || '').trim() || null;
    const section = String(body.section || '').trim() || null;
    const location = String(body.location || '').trim() || null;
    const equipmentName = String(body.equipmentName || '').trim() || null;
    const equipmentCode = String(body.equipmentCode || '').trim() || null;
    const immediateAction =
      String(body.immediateAction || '').trim() || null;

    // Equipment details are required for equipment defect reports.
    if (reportType === 'equipment_defect' && !equipmentName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide the name of the defective equipment.',
        },
        { status: 400 },
      );
    }

    const reportNumber = `SAF-${reportDateString.replace(/-/g, '')}-${Date.now()
      .toString()
      .slice(-6)}`;

    const inserted = await db
      .insert(safetyReports)
      .values({
        reportNumber,
        reportDate,
        reportType: reportType as
          | 'hazard'
          | 'accident'
          | 'injury'
          | 'near_miss'
          | 'equipment_defect',
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        title,
        description,
        farm,
        section,
        location,
        equipmentName,
        equipmentCode,
        immediateAction,
        reportedByEmployeeId: session.employeeId || null,
        reportedByUserId: session.userId,
        assignedToEmployeeId,
        status: assignedToEmployeeId ? 'in_progress' : 'open',
        createdBy: session.userId,
      })
      .$returningId();

    const reportId = inserted[0]?.id;

    if (!reportId) {
      throw new Error('The safety report could not be created.');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Safety report submitted successfully.',
        reportId,
        reportNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/safety-reports] error:', error);

    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'Failed to submit safety report.';

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
