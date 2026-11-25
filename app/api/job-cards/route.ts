
import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, like } from 'drizzle-orm';

import { db } from '@/db';
import {
  appUsers,
  employees,
  welfareJobCards,
  jobCardEquipment,
} from '@/db/schema';
import { getSession } from '@/lib/auth';

const BLOCKED_JOB_CARD_ROLES = new Set([
  'supervisor',
  'senior_supervisor',
  'head_of_department',
  'hod',
]);

function isJobCardRoleAllowed(role: string | null | undefined) {
  const normalizedRole = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

  return (
    normalizedRole.length > 0 &&
    !BLOCKED_JOB_CARD_ROLES.has(normalizedRole) &&
    !normalizedRole.includes('supervisor') &&
    normalizedRole !== 'head_of_department' &&
    normalizedRole !== 'hod'
  );
}

async function getWorkerEmployee(userId: number) {
  const [account] = await db
    .select({
      employeeId: appUsers.employeeId,
      isActive: appUsers.isActive,
      role: appUsers.role,
    })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);

  if (!account || account.isActive !== 'yes') {
    return {
      error: 'Your account is inactive or could not be found.',
      status: 403,
    } as const;
  }

  if (!isJobCardRoleAllowed(account.role)) {
    return {
      error: 'You are not authorised to access the worker Job Cards module.',
      status: 403,
    } as const;
  }

  if (!account.employeeId) {
    return {
      error:
        'Your account is not linked to an employee record. Please contact the administrator.',
      status: 403,
    } as const;
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, account.employeeId))
    .limit(1);

  if (
    !employee ||
    employee.status !== 'active' ||
    employee.department?.trim().toLowerCase() !== 'welfare'
  ) {
    return {
      error: 'Your employee record is not an active Welfare employee.',
      status: 403,
    } as const;
  }

  return { employee } as const;
}

// GET /api/job-cards
// Workers can only view their own Job Cards.
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to access Job Cards.',
        },
        { status: 401 },
      );
    }

    const result = await getWorkerEmployee(Number(session.userId));

    if ('error' in result) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: result.status },
      );
    }

    const jobCards = await db
      .select()
      .from(welfareJobCards)
      .where(eq(welfareJobCards.employeeId, result.employee.id))
      .orderBy(desc(welfareJobCards.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      jobCards,
    });
  } catch (error) {
    console.error('[GET /api/job-cards] error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve your Job Cards.',
      },
      { status: 500 },
    );
  }
}

// POST /api/job-cards
// Creates and submits a daily worker Job Card.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to submit Job Cards.',
        },
        { status: 401 },
      );
    }

    const result = await getWorkerEmployee(Number(session.userId));

    if ('error' in result) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: result.status },
      );
    }

    const employee = result.employee;
    const body = await request.json();

    const jobDateString = String(body.jobDate || '').trim();
    const jobDescription = String(body.jobDescription || '').trim();
    const eveningWork = String(body.afterLunchWork || '').trim();
    const toolsUsed = String(body.toolsUsed || '').trim();
    const defectsEncountered = String(body.defectsEncountered || '').trim();

    const section = String(body.section || '').trim();
    const specificArea = String(body.specificArea || '').trim();

    const language: 'en' | 'sw' = body.language === 'sw' ? 'sw' : 'en';

    if (!jobDateString || !jobDescription) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Work date and morning work details are required.',
        },
        { status: 400 },
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(jobDateString)) {
      return NextResponse.json(
        { success: false, message: 'Invalid work date.' },
        { status: 400 },
      );
    }

    const [year, month, day] = jobDateString.split('-').map(Number);
    const jobDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(jobDate.getTime()) ||
      jobDate.getFullYear() !== year ||
      jobDate.getMonth() !== month - 1 ||
      jobDate.getDate() !== day
    ) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid work date.' },
        { status: 400 },
      );
    }

    // Generate the next Job Card number for the year.
    const jobYear = String(year);

    const existingCards = await db
      .select({
        jobCardNumber: welfareJobCards.jobCardNumber,
      })
      .from(welfareJobCards)
      .where(like(welfareJobCards.jobCardNumber, `WJC-%/${jobYear}`));

    let highestNumber = 0;

    for (const card of existingCards) {
      const match = card.jobCardNumber.match(
        new RegExp(`^WJC-(\\d+)/${jobYear}$`),
      );

      if (match) {
        highestNumber = Math.max(highestNumber, Number(match[1]));
      }
    }

    const nextNumber = String(highestNumber + 1).padStart(3, '0');
    const jobCardNumber = `WJC-${nextNumber}/${jobYear}`;

    const insertValues = {
      jobCardNumber,

      // Employee identity comes from the logged-in account.
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      designation: employee.designation ?? null,

      jobDate,
      jobDescription,
      section: section || null,
      specificArea: specificArea || null,

      // Retain existing legacy time fields as null.
      startTime: null,
      endTime: null,
      lunchInformation: null,

      // Evening work details.
      afterLunchWork: eveningWork || null,
      afterLunchStartTime: null,
      afterLunchEndTime: null,

      defectsEncountered: defectsEncountered || null,

      language,

      // The report enters the supervisor inbox immediately.
      status: 'submitted' as const,
      submittedAt: new Date(),

      createdBy: Number(session.userId),
    };

    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(welfareJobCards)
        .values(insertValues)
        .$returningId();

      const newRecord = Array.isArray(inserted)
        ? inserted[0]
        : inserted;

      if (!newRecord?.id) {
        throw new Error('Unable to obtain the new Job Card ID.');
      }

      if (toolsUsed) {
        await tx.insert(jobCardEquipment).values({
          jobCardId: newRecord.id,
          equipmentName: 'Tools and equipment used',
          quantity: 1,
          remarks: toolsUsed,
        });
      }

      return newRecord;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Daily work report submitted successfully.',
        jobCardId: created.id,
        jobCardNumber,
        status: 'submitted',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/job-cards] error:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to submit the daily work report.',
      },
      { status: 500 },
    );
  }
}
