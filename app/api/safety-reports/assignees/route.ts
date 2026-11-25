
import { NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  employees,
  employeeSupervisorAssignments,
} from '@/db/schema';

import {
  requirePermission,
  PERMISSIONS,
  ROLES,
} from '@/lib/permissions';

export async function GET() {
  try {
    const session = await requirePermission(
      PERMISSIONS.ASSIGN_SAFETY_REPORTS,
    );

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          canAssign: false,
          message: 'You are not authorised to assign safety reports.',
        },
        { status: 403 },
      );
    }

    let records;

    // System administrator: all active Welfare employees.
    if (session.role === ROLES.SYSTEM_ADMIN) {
      records = await db
        .select({
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
        })
        .from(employees)
        .where(
          and(
            eq(employees.department, 'Welfare'),
            eq(employees.status, 'active'),
          ),
        )
        .orderBy(asc(employees.fullName));
    }

    // Head of Department: all active Welfare employees.
    else if (session.role === ROLES.HEAD_OF_DEPARTMENT) {
      records = await db
        .select({
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
        })
        .from(employees)
        .where(
          and(
            eq(employees.department, 'Welfare'),
            eq(employees.status, 'active'),
          ),
        )
        .orderBy(asc(employees.fullName));
    }

    // Supervisor: only employees assigned to that supervisor.
    else if (session.role === ROLES.SUPERVISOR) {
      if (!session.employeeId) {
        return NextResponse.json({
          success: true,
          canAssign: true,
          employees: [],
        });
      }

      records = await db
        .select({
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
        })
        .from(employees)
        .where(
          and(
            eq(employees.department, 'Welfare'),
            eq(employees.status, 'active'),
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
          ),
        )
        .orderBy(asc(employees.fullName));
    } else {
      return NextResponse.json(
        {
          success: false,
          canAssign: false,
          message: 'Your role cannot assign safety reports.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      canAssign: true,
      employees: records,
    });
  } catch (error) {
    console.error('GET safety report assignees error:', error);

    return NextResponse.json(
      {
        success: false,
        canAssign: false,
        message: 'Failed to load employees for assignment.',
      },
      { status: 500 },
    );
  }
}
