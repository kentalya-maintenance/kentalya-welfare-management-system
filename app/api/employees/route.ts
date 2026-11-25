
import { NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  employeeSupervisorAssignments,
} from '@/db/schema';

import {
  requirePermission,
  requireAnyRole,
  PERMISSIONS,
  ROLES,
} from '@/lib/permissions';

// ============================================================
// GET EMPLOYEES
// ============================================================

export async function GET() {
  try {
    const session = await requirePermission(
      PERMISSIONS.VIEW_EMPLOYEES,
    );

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to view employees.',
        },
        { status: 403 },
      );
    }

    let records;

    // SYSTEM ADMIN: ALL EMPLOYEES
    if (session.role === ROLES.SYSTEM_ADMIN) {
      records = await db
        .select()
        .from(employees)
        .orderBy(asc(employees.fullName));
    }

    // DIRECTOR, HOD AND SENIOR SUPERVISOR:
    // ALL WELFARE EMPLOYEES
    else if (
      session.role === ROLES.DIRECTOR ||
      session.role === ROLES.HEAD_OF_DEPARTMENT ||
      session.role === ROLES.SENIOR_SUPERVISOR
    ) {
      records = await db
        .select()
        .from(employees)
        .where(eq(employees.department, 'Welfare'))
        .orderBy(asc(employees.fullName));
    }

    // SUPERVISOR:
    // EMPLOYEES ASSIGNED TO THAT SUPERVISOR
    else if (session.role === ROLES.SUPERVISOR) {
      if (!session.employeeId) {
        return NextResponse.json({
          success: true,
          employees: [],
        });
      }

      records = await db
        .select()
        .from(employees)
        .where(
          inArray(
            employees.id,
            db
              .select({
                employeeId:
                  employeeSupervisorAssignments.employeeId,
              })
              .from(employeeSupervisorAssignments)
              .where(
                eq(
                  employeeSupervisorAssignments.supervisorEmployeeId,
                  session.employeeId,
                ),
              ),
          ),
        )
        .orderBy(asc(employees.fullName));
    }

    // OTHER ROLES
    else {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to view employees.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      employees: records,
    });
  } catch (error) {
    console.error('GET employees error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve employees.',
      },
      { status: 500 },
    );
  }
}

// ============================================================
// POST EMPLOYEE
// ONLY SYSTEM ADMIN AND HOD CAN REGISTER STAFF
// ============================================================

export async function POST(request: Request) {
  try {
    const session = await requireAnyRole([
      ROLES.SYSTEM_ADMIN,
      ROLES.HEAD_OF_DEPARTMENT,
    ]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to register employees.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const employeeNumber = String(
      body.employeeNumber ?? '',
    ).trim();

    const fullName = String(
      body.fullName ?? '',
    ).trim();

    const designation = String(
      body.designation ?? '',
    ).trim();

    const section = String(
      body.section ?? '',
    ).trim();

    const email = String(
      body.email ?? '',
    ).trim();

    const phone = String(
      body.phone ?? '',
    ).trim();

    if (!employeeNumber || !fullName || !designation) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Employee number, full name and designation are required.',
        },
        { status: 400 },
      );
    }

    const existing = await db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(
        eq(employees.employeeNumber, employeeNumber),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'An employee with this P/No. already exists.',
        },
        { status: 409 },
      );
    }

    const department = 'Welfare';

    const result = await db.insert(employees).values({
      employeeNumber,
      fullName,
      designation,
      department,
      section: section || null,
      email: email || null,
      phone: phone || null,
      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Employee registered successfully.',
        employeeId: Number(result[0].insertId),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST employee error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to register employee.',
      },
      { status: 500 },
    );
  }
}
