
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

    if (session.role === ROLES.SYSTEM_ADMIN) {
      records = await db
        .select()
        .from(employees)
        .orderBy(asc(employees.fullName));
    } else if (
      session.role === ROLES.DIRECTOR ||
      session.role === ROLES.HEAD_OF_DEPARTMENT ||
      session.role === ROLES.SENIOR_SUPERVISOR
    ) {
      records = await db
        .select()
        .from(employees)
        .where(eq(employees.department, 'Welfare'))
        .orderBy(asc(employees.fullName));
    } else if (session.role === ROLES.SUPERVISOR) {
      if (!session.employeeId) {
        return NextResponse.json({
          success: true,
          employees: [],
          canDelete: false,
          canEdit: false,
          canManageStatus: false,
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
    } else {
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
      canDelete: session.role === ROLES.SYSTEM_ADMIN,
      canEdit: [
        ROLES.SYSTEM_ADMIN,
        ROLES.HEAD_OF_DEPARTMENT,
      ].includes(session.role),
      canManageStatus: session.role === ROLES.SYSTEM_ADMIN,
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
// REGISTER EMPLOYEE
// SYSTEM ADMIN AND HOD ONLY
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

    if (
      employeeNumber.length > 50 ||
      fullName.length > 255 ||
      designation.length > 255 ||
      section.length > 255 ||
      email.length > 255 ||
      phone.length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more employee fields exceed the allowed length.',
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

    const result = await db.insert(employees).values({
      employeeNumber,
      fullName,
      designation,
      department: 'Welfare',
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

// ============================================================
// EDIT EMPLOYEE DETAILS
// SYSTEM ADMIN AND HOD ONLY
// ============================================================

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const employeeId = Number(body.id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid employee ID is required.',
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // ACTIVATE OR DEACTIVATE EMPLOYEE
    // SYSTEM ADMIN ONLY
    // --------------------------------------------------------

    if (body.action === 'status') {
      const session = await requireAnyRole([
        ROLES.SYSTEM_ADMIN,
      ]);

      if (!session) {
        return NextResponse.json(
          {
            success: false,
            message: 'Only the System Admin can change employee status.',
          },
          { status: 403 },
        );
      }

      const status = body.status;

      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json(
          {
            success: false,
            message: 'Status must be active or inactive.',
          },
          { status: 400 },
        );
      }

      const existing = await db
        .select({
          id: employees.id,
          status: employees.status,
        })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Employee not found.',
          },
          { status: 404 },
        );
      }

      if (existing[0].status === status) {
        return NextResponse.json({
          success: true,
          message:
            status === 'active'
              ? 'This employee is already active.'
              : 'This employee is already inactive.',
        });
      }

      await db
        .update(employees)
        .set({ status })
        .where(eq(employees.id, employeeId));

      return NextResponse.json({
        success: true,
        message:
          status === 'active'
            ? 'Employee reactivated successfully.'
            : 'Employee deactivated successfully. Historical records have been preserved.',
      });
    }

    // --------------------------------------------------------
    // UPDATE EMPLOYEE DETAILS
    // SYSTEM ADMIN AND HOD ONLY
    // --------------------------------------------------------

    const session = await requireAnyRole([
      ROLES.SYSTEM_ADMIN,
      ROLES.HEAD_OF_DEPARTMENT,
    ]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to edit employees.',
        },
        { status: 403 },
      );
    }

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

    if (
      employeeNumber.length > 50 ||
      fullName.length > 255 ||
      designation.length > 255 ||
      section.length > 255 ||
      email.length > 255 ||
      phone.length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more employee fields exceed the allowed length.',
        },
        { status: 400 },
      );
    }

    const existingEmployee = await db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found.',
        },
        { status: 404 },
      );
    }

    const duplicate = await db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(
        eq(employees.employeeNumber, employeeNumber),
      )
      .limit(1);

    if (
      duplicate.length > 0 &&
      duplicate[0].id !== employeeId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Another employee already uses this P/No.',
        },
        { status: 409 },
      );
    }

    await db
      .update(employees)
      .set({
        employeeNumber,
        fullName,
        designation,
        department: 'Welfare',
        section: section || null,
        email: email || null,
        phone: phone || null,
      })
      .where(eq(employees.id, employeeId));

    return NextResponse.json({
      success: true,
      message: 'Employee details updated successfully.',
    });
  } catch (error) {
    console.error('PATCH employee error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update employee.',
      },
      { status: 500 },
    );
  }
}

// ============================================================
// DEACTIVATE EMPLOYEE
// LEGACY DELETE SUPPORT
// SYSTEM ADMIN ONLY
// PRESERVES JOB CARDS AND HISTORICAL RECORDS
// ============================================================

export async function DELETE(request: Request) {
  try {
    const session = await requireAnyRole([
      ROLES.SYSTEM_ADMIN,
    ]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the System Admin can deactivate employees.',
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = Number(searchParams.get('id'));

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid employee ID is required.',
        },
        { status: 400 },
      );
    }

    const existing = await db
      .select({
        id: employees.id,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found.',
        },
        { status: 404 },
      );
    }

    if (existing[0].status === 'inactive') {
      return NextResponse.json({
        success: true,
        message: 'This employee is already inactive.',
      });
    }

    await db
      .update(employees)
      .set({ status: 'inactive' })
      .where(eq(employees.id, employeeId));

    return NextResponse.json({
      success: true,
      message:
        'Employee deactivated successfully. Existing job cards and historical records have been preserved.',
    });
  } catch (error) {
    console.error('DEACTIVATE employee error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to deactivate employee.',
      },
      { status: 500 },
    );
  }
}
