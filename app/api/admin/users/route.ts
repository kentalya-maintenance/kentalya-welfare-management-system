
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

import { db } from '@/db';
import { appUsers, employees } from '@/db/schema';

import {
  requireAnyRole,
  ROLES,
  isValidRole,
} from '@/lib/permissions';

// ============================================================
// GET - LIST APPLICATION USERS
// SYSTEM ADMINISTRATOR ONLY
// ============================================================

export async function GET() {
  try {
    const session = await requireAnyRole([
      ROLES.SYSTEM_ADMIN,
    ]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the System Administrator can manage users.',
        },
        { status: 403 },
      );
    }

    const records = await db
      .select({
        id: appUsers.id,
        username: appUsers.username,
        role: appUsers.role,
        isActive: appUsers.isActive,
        employeeId: appUsers.employeeId,
        employeeName: employees.fullName,
        employeeNumber: employees.employeeNumber,
        department: employees.department,
        designation: employees.designation,
        createdAt: appUsers.createdAt,
      })
      .from(appUsers)
      .leftJoin(
        employees,
        eq(appUsers.employeeId, employees.id),
      )
      .orderBy(asc(appUsers.username));

    return NextResponse.json({
      success: true,
      users: records,
    });
  } catch (error) {
    console.error('GET admin users error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve application users.',
      },
      { status: 500 },
    );
  }
}

// ============================================================
// POST - CREATE APPLICATION USER
// SYSTEM ADMINISTRATOR ONLY
// ============================================================

export async function POST(request: Request) {
  try {
    const session = await requireAnyRole([
      ROLES.SYSTEM_ADMIN,
    ]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the System Administrator can create users.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const username = String(
      body.username ?? '',
    ).trim();

    const password = String(
      body.password ?? '',
    );

    const role = String(
      body.role ?? '',
    ).trim();

    const employeeId =
      body.employeeId === null ||
      body.employeeId === undefined ||
      body.employeeId === ''
        ? null
        : Number(body.employeeId);

    // Validate required fields.
    if (!username || !password || !role) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username, password and role are required.',
        },
        { status: 400 },
      );
    }

    // Validate username.
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Username must be 3-50 characters and contain only letters, numbers, dots, underscores or hyphens.',
        },
        { status: 400 },
      );
    }

    // Validate password.
    if (password.length < 12) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must contain at least 12 characters.',
        },
        { status: 400 },
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password cannot exceed 128 characters.',
        },
        { status: 400 },
      );
    }

    // Validate role.
    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid application role.',
        },
        { status: 400 },
      );
    }

    // All non-admin accounts must be linked to an employee.
    if (role !== ROLES.SYSTEM_ADMIN && employeeId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Select an employee for this application account.',
        },
        { status: 400 },
      );
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) || employeeId <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid employee selection.',
        },
        { status: 400 },
      );
    }

    // Check whether username already exists.
    const existingUsername = await db
      .select({
        id: appUsers.id,
      })
      .from(appUsers)
      .where(eq(appUsers.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'This username is already in use.',
        },
        { status: 409 },
      );
    }

    // Validate the selected employee.
    if (employeeId !== null) {
      const selectedEmployee = await db
        .select({
          id: employees.id,
          department: employees.department,
          status: employees.status,
        })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);

      if (selectedEmployee.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'The selected employee does not exist.',
          },
          { status: 404 },
        );
      }

      if (selectedEmployee[0].department !== 'Welfare') {
        return NextResponse.json(
          {
            success: false,
            message:
              'Only employees belonging to the Welfare Department can be linked to this application.',
          },
          { status: 400 },
        );
      }

      if (selectedEmployee[0].status !== 'active') {
        return NextResponse.json(
          {
            success: false,
            message:
              'An inactive employee cannot receive an application account.',
          },
          { status: 400 },
        );
      }

      // Prevent one employee from having multiple accounts.
      const existingEmployeeAccount = await db
        .select({
          id: appUsers.id,
        })
        .from(appUsers)
        .where(eq(appUsers.employeeId, employeeId))
        .limit(1);

      if (existingEmployeeAccount.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'This employee is already linked to an application account.',
          },
          { status: 409 },
        );
      }
    }

    // Securely hash the password.
    const passwordHash = await hash(password, 12);

    // Create the application account.
    const result = await db.insert(appUsers).values({
      username,
      passwordHash,
      employeeId,
      role,
      isActive: 'yes',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Application user created successfully.',
        user: {
          id: Number(result[0].insertId),
          username,
          role,
          employeeId,
          isActive: 'yes',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST admin user error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create application user.',
      },
      { status: 500 },
    );
  }
}
