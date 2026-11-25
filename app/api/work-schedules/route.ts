
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  employeeSupervisorAssignments,
  workSchedules,
  workScheduleAssignments,
} from '@/db/schema';
import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// ============================================================
// GET /api/work-schedules
// ============================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised to view work schedules.' },
        { status: 401 },
      );
    }

    let schedules;
    let visibleEmployeeIds: number[] | null = null;

    if (
      hasPermission(session.role, PERMISSIONS.VIEW_ALL_WORK_SCHEDULES) ||
      hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_WORK_SCHEDULES)
    ) {
      schedules = await db
        .select()
        .from(workSchedules)
        .orderBy(desc(workSchedules.scheduleDate), desc(workSchedules.createdAt));
    } else if (
      hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_WORK_SCHEDULES)
    ) {
      if (!session.employeeId) {
        return NextResponse.json({ success: true, schedules: [] });
      }

      const supervisedEmployees = await db
        .select({ employeeId: employeeSupervisorAssignments.employeeId })
        .from(employeeSupervisorAssignments)
        .where(
          eq(
            employeeSupervisorAssignments.supervisorEmployeeId,
            session.employeeId,
          ),
        );

      visibleEmployeeIds = supervisedEmployees.map((item) => item.employeeId);

      if (visibleEmployeeIds.length === 0) {
        return NextResponse.json({ success: true, schedules: [] });
      }

      const assignedSchedules = await db
        .select({ scheduleId: workScheduleAssignments.scheduleId })
        .from(workScheduleAssignments)
        .where(inArray(workScheduleAssignments.employeeId, visibleEmployeeIds));

      const scheduleIds: number[] = [
        ...new Set(assignedSchedules.map((item) => item.scheduleId)),
      ];

      if (scheduleIds.length === 0) {
        return NextResponse.json({ success: true, schedules: [] });
      }

      schedules = await db
        .select()
        .from(workSchedules)
        .where(inArray(workSchedules.id, scheduleIds))
        .orderBy(desc(workSchedules.scheduleDate), desc(workSchedules.createdAt));
    } else if (
      hasPermission(session.role, PERMISSIONS.VIEW_OWN_WORK_SCHEDULES)
    ) {
      if (!session.employeeId) {
        return NextResponse.json({ success: true, schedules: [] });
      }

      visibleEmployeeIds = [session.employeeId];

      const ownAssignments = await db
        .select({ scheduleId: workScheduleAssignments.scheduleId })
        .from(workScheduleAssignments)
        .where(eq(workScheduleAssignments.employeeId, session.employeeId));

      const scheduleIds: number[] = [
        ...new Set(ownAssignments.map((item) => item.scheduleId)),
      ];

      if (scheduleIds.length === 0) {
        return NextResponse.json({ success: true, schedules: [] });
      }

      schedules = await db
        .select()
        .from(workSchedules)
        .where(inArray(workSchedules.id, scheduleIds))
        .orderBy(desc(workSchedules.scheduleDate), desc(workSchedules.createdAt));
    } else {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view work schedules.' },
        { status: 403 },
      );
    }

    if (schedules.length === 0) {
      return NextResponse.json({ success: true, schedules: [] });
    }

    const scheduleIds: number[] = schedules.map((schedule) => schedule.id);

    const assignmentConditions = [
      inArray(workScheduleAssignments.scheduleId, scheduleIds),
    ];

    if (visibleEmployeeIds !== null) {
      assignmentConditions.push(
        inArray(workScheduleAssignments.employeeId, visibleEmployeeIds),
      );
    }

    const assignmentRows = await db
      .select({
        assignment: workScheduleAssignments,
        employee: {
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
          designation: employees.designation,
          section: employees.section,
        },
      })
      .from(workScheduleAssignments)
      .innerJoin(
        employees,
        eq(workScheduleAssignments.employeeId, employees.id),
      )
      .where(and(...assignmentConditions));

    const result = schedules.map((schedule) => ({
      ...schedule,
      assignments: assignmentRows
        .filter((row) => row.assignment.scheduleId === schedule.id)
        .map((row) => ({
          ...row.assignment,
          employee: row.employee,
        })),
    }));

    return NextResponse.json({
      success: true,
      schedules: result,
    });
  } catch (error) {
    console.error('[GET /api/work-schedules] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to retrieve work schedules.' },
      { status: 500 },
    );
  }
}

// ============================================================
// POST /api/work-schedules
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'You are not authorised to create work schedules.' },
        { status: 401 },
      );
    }

    if (!hasPermission(session.role, PERMISSIONS.CREATE_WORK_SCHEDULES)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create work schedules.' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const scheduleDateString = String(body.scheduleDate || '').trim();
    const taskTitle = String(body.taskTitle || '').trim();
    const taskDescription = String(body.taskDescription || '').trim();

    const employeeIds: number[] = Array.isArray(body.employeeIds)
      ? Array.from(
          new Set<number>(
            (body.employeeIds as unknown[])
              .map((id): number => Number(id))
              .filter(
                (id: number) => Number.isSafeInteger(id) && id > 0,
              ),
          ),
        )
      : [];

    if (!scheduleDateString || !taskTitle || !taskDescription) {
      return NextResponse.json(
        {
          success: false,
          message: 'Schedule date, task title and task description are required.',
        },
        { status: 400 },
      );
    }

    if (employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please select at least one employee.' },
        { status: 400 },
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDateString)) {
      return NextResponse.json(
        { success: false, message: 'Invalid schedule date.' },
        { status: 400 },
      );
    }

    const [year, month, day] = scheduleDateString.split('-').map(Number);
    const scheduleDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(scheduleDate.getTime()) ||
      scheduleDate.getFullYear() !== year ||
      scheduleDate.getMonth() !== month - 1 ||
      scheduleDate.getDate() !== day
    ) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid schedule date.' },
        { status: 400 },
      );
    }

    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      (startTime && !validTime.test(startTime)) ||
      (endTime && !validTime.test(endTime))
    ) {
      return NextResponse.json(
        { success: false, message: 'Please enter working times in HH:MM format.' },
        { status: 400 },
      );
    }

    const selectedEmployees = await db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        status: employees.status,
        department: employees.department,
      })
      .from(employees)
      .where(inArray(employees.id, employeeIds));

    if (selectedEmployees.length !== employeeIds.length) {
      return NextResponse.json(
        { success: false, message: 'One or more selected employees could not be found.' },
        { status: 400 },
      );
    }

    const invalidEmployees = selectedEmployees.filter(
      (employee) =>
        employee.status !== 'active' ||
        employee.department !== 'Welfare',
    );

    if (invalidEmployees.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Only active Welfare employees can be scheduled.' },
        { status: 400 },
      );
    }

    if (
      hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_WORK_SCHEDULES)
    ) {
      if (!session.employeeId) {
        return NextResponse.json(
          { success: false, message: 'Your account is not linked to an employee record.' },
          { status: 403 },
        );
      }

      const permittedAssignments = await db
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
            inArray(
              employeeSupervisorAssignments.employeeId,
              employeeIds,
            ),
          ),
        );

      const permittedEmployeeIds = new Set<number>(
        permittedAssignments.map((item) => item.employeeId),
      );

      const unauthorizedEmployee = employeeIds.some(
        (id: number) => !permittedEmployeeIds.has(id),
      );

      if (unauthorizedEmployee) {
        return NextResponse.json(
          {
            success: false,
            message: 'You can only schedule employees assigned to you.',
          },
          { status: 403 },
        );
      }
    }

    const scheduleNumber = `WS-${scheduleDateString.replace(/-/g, '')}-${Date.now()
      .toString()
      .slice(-6)}`;

    const createdSchedule = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(workSchedules)
        .values({
          scheduleNumber,
          scheduleDate,
          taskTitle,
          taskDescription,
          section: String(body.section || '').trim() || null,
          location: String(body.location || '').trim() || null,
          startTime: startTime || null,
          endTime: endTime || null,
          instructions: String(body.instructions || '').trim() || null,
          status: 'assigned',
          createdBy: session.userId,
        })
        .$returningId();

      const scheduleId = inserted[0]?.id;

      if (!scheduleId) {
        throw new Error('The work schedule could not be created.');
      }

      const assignmentValues = employeeIds.map((employeeId: number) => ({
        scheduleId,
        employeeId,
        assignedBy: session.userId,
        status: 'assigned' as const,
      }));

      await tx
        .insert(workScheduleAssignments)
        .values(assignmentValues);

      return {
        id: scheduleId,
        scheduleNumber,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Work schedule created successfully.',
        scheduleId: createdSchedule.id,
        scheduleNumber: createdSchedule.scheduleNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/work-schedules] error:', error);

    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'Failed to create work schedule.';

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
