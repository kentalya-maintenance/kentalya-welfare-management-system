
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees } from '@/db/schema';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised. Please log in.',
        },
        { status: 401 },
      );
    }

    if (!session.employeeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Your account is not linked to an employee. Please contact the System Administrator.',
        },
        { status: 400 },
      );
    }

    const [employee] = await db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        designation: employees.designation,
        section: employees.section,
        department: employees.department,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.id, session.employeeId))
      .limit(1);

    if (!employee || employee.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          message: 'Your linked employee record is missing or inactive.',
        },
        { status: 404 },
      );
    }

    if (employee.department !== 'Welfare') {
      return NextResponse.json(
        {
          success: false,
          message: 'Your employee account is not registered under Welfare.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error('[GET /api/me/employee] error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load your employee information.',
      },
      { status: 500 },
    );
  }
}
