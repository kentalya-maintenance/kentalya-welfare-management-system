
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import {
  appUsers,
  employees,
  approvalDelegations,
} from '@/db/schema';
import { getSession } from '@/lib/auth';

function normalizeRole(role: string | null | undefined): string {
  return (role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isAllowedDelegator(role: string): boolean {
  return [
    'senior_supervisor',
    'head_of_department',
    'hod',
    'department_head',
    'director',
  ].includes(normalizeRole(role));
}

function isAllowedDelegate(role: string): boolean {
  return [
    'supervisor',
    'senior_supervisor',
    'head_of_department',
    'hod',
    'department_head',
    'director',
  ].includes(normalizeRole(role));
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const dateValue = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(dateValue.getTime()) &&
    dateValue.toISOString().slice(0, 10) === value
  );
}

async function getActiveAccount(userId: number) {
  const [account] = await db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      role: appUsers.role,
      isActive: appUsers.isActive,
      employeeId: appUsers.employeeId,
    })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);

  if (!account || account.isActive !== 'yes') {
    return null;
  }

  return account;
}

async function getUserDetails(userIds: number[]) {
  const uniqueIds = [...new Set(userIds)];

  if (uniqueIds.length === 0) {
    return new Map<
      number,
      { username: string; role: string; fullName: string; designation: string | null }
    >();
  }

  const accounts = await db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      role: appUsers.role,
      employeeId: appUsers.employeeId,
    })
    .from(appUsers)
    .where(inArray(appUsers.id, uniqueIds));

  const employeeIds = accounts
    .map((account) => account.employeeId)
    .filter((id): id is number => id !== null);

  const employeeRecords =
    employeeIds.length > 0
      ? await db
          .select({
            id: employees.id,
            fullName: employees.fullName,
            designation: employees.designation,
          })
          .from(employees)
          .where(inArray(employees.id, employeeIds))
      : [];

  const employeeMap = new Map(
    employeeRecords.map((employee) => [employee.id, employee]),
  );

  const result = new Map<
    number,
    { username: string; role: string; fullName: string; designation: string | null }
  >();

  for (const account of accounts) {
    const employee = account.employeeId
      ? employeeMap.get(account.employeeId)
      : undefined;

    result.set(account.id, {
      username: account.username,
      role: account.role,
      fullName: employee?.fullName || account.username,
      designation: employee?.designation || null,
    });
  }

  return result;
}

// ============================================================
// GET: VIEW DELEGATIONS AND ELIGIBLE DELEGATES
// ============================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in.' },
        { status: 401 },
      );
    }

    const account = await getActiveAccount(Number(session.userId));

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Your account is inactive or unavailable.' },
        { status: 403 },
      );
    }

    const delegations = await db
      .select()
      .from(approvalDelegations)
      .where(
        or(
          eq(approvalDelegations.delegatorUserId, account.id),
          eq(approvalDelegations.delegateUserId, account.id),
        ),
      )
      .orderBy(desc(approvalDelegations.createdAt));

    const userIds = delegations.flatMap((delegation) => [
      delegation.delegatorUserId,
      delegation.delegateUserId,
      delegation.createdBy,
      ...(delegation.cancelledBy ? [delegation.cancelledBy] : []),
    ]);

    const userDetails = await getUserDetails(userIds);

    const formattedDelegations = delegations.map((delegation) => ({
      ...delegation,
      delegator: userDetails.get(delegation.delegatorUserId) || null,
      delegate: userDetails.get(delegation.delegateUserId) || null,
      creator: userDetails.get(delegation.createdBy) || null,
      canceller: delegation.cancelledBy
        ? userDetails.get(delegation.cancelledBy) || null
        : null,
      isMyDelegation: delegation.delegatorUserId === account.id,
      isDelegatedToMe: delegation.delegateUserId === account.id,
    }));

    let eligibleDelegates: Array<{
      id: number;
      username: string;
      fullName: string;
      role: string;
      designation: string | null;
    }> = [];

    if (isAllowedDelegator(account.role)) {
      const eligibleAccounts = await db
        .select({
          id: appUsers.id,
          username: appUsers.username,
          role: appUsers.role,
          employeeId: appUsers.employeeId,
        })
        .from(appUsers)
        .where(eq(appUsers.isActive, 'yes'));

      const eligible = eligibleAccounts.filter(
        (candidate) =>
          candidate.id !== account.id && isAllowedDelegate(candidate.role),
      );

      const eligibleDetails = await getUserDetails(
        eligible.map((candidate) => candidate.id),
      );

      eligibleDelegates = eligible.map((candidate) => {
        const details = eligibleDetails.get(candidate.id);

        return {
          id: candidate.id,
          username: candidate.username,
          fullName: details?.fullName || candidate.username,
          role: candidate.role,
          designation: details?.designation || null,
        };
      });
    }

    return NextResponse.json({
      success: true,
      delegations: formattedDelegations,
      eligibleDelegates,
      canCreateDelegation: isAllowedDelegator(account.role),
    });
  } catch (error) {
    console.error('GET approval delegations error:', error);

    return NextResponse.json(
      { success: false, message: 'Unable to load approval delegations.' },
      { status: 500 },
    );
  }
}

// ============================================================
// POST: CREATE A DELEGATION
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in.' },
        { status: 401 },
      );
    }

    const account = await getActiveAccount(Number(session.userId));

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Your account is inactive or unavailable.' },
        { status: 403 },
      );
    }

    if (!isAllowedDelegator(account.role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account is not authorised to delegate approval.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const delegateUserId = Number(body.delegateUserId);
    const startDate =
      typeof body.startDate === 'string' ? body.startDate.trim() : '';
    const endDate =
      typeof body.endDate === 'string' ? body.endDate.trim() : '';
    const reason =
      typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!Number.isInteger(delegateUserId) || delegateUserId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Please select a valid delegate.' },
        { status: 400 },
      );
    }

    if (delegateUserId === account.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot delegate approval to yourself.' },
        { status: 400 },
      );
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        { success: false, message: 'Please enter valid start and end dates.' },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, message: 'The end date cannot be before the start date.' },
        { status: 400 },
      );
    }

    const delegate = await getActiveAccount(delegateUserId);

    if (!delegate || !isAllowedDelegate(delegate.role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'The selected account is not an eligible active delegate.',
        },
        { status: 400 },
      );
    }

    // Prevent overlapping active delegations by the same person.
    const overlapping = await db
      .select({ id: approvalDelegations.id })
      .from(approvalDelegations)
      .where(
        and(
          eq(approvalDelegations.delegatorUserId, account.id),
          eq(approvalDelegations.status, 'active'),
          lte(approvalDelegations.startDate, endDate),
          gte(approvalDelegations.endDate, startDate),
        ),
      )
      .limit(1);

    if (overlapping.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You already have an active delegation that overlaps these dates. Cancel it or choose different dates.',
        },
        { status: 409 },
      );
    }

    await db.insert(approvalDelegations).values({
      delegatorUserId: account.id,
      delegateUserId: delegate.id,
      delegatorRole: account.role,
      startDate,
      endDate,
      reason: reason || null,
      status: 'active',
      createdBy: account.id,
    });

    return NextResponse.json({
      success: true,
      message: `Approval authority delegated to ${delegate.username}.`,
    });
  } catch (error) {
    console.error('POST approval delegation error:', error);

    return NextResponse.json(
      { success: false, message: 'Unable to create the approval delegation.' },
      { status: 500 },
    );
  }
}

// ============================================================
// PATCH: CANCEL A DELEGATION
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in.' },
        { status: 401 },
      );
    }

    const account = await getActiveAccount(Number(session.userId));

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Your account is inactive or unavailable.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const delegationId = Number(body.id);

    if (!Number.isInteger(delegationId) || delegationId <= 0) {
      return NextResponse.json(
        { success: false, message: 'A valid delegation ID is required.' },
        { status: 400 },
      );
    }

    const [delegation] = await db
      .select()
      .from(approvalDelegations)
      .where(
        and(
          eq(approvalDelegations.id, delegationId),
          eq(approvalDelegations.delegatorUserId, account.id),
        ),
      )
      .limit(1);

    if (!delegation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Delegation not found or you are not authorised to cancel it.',
        },
        { status: 404 },
      );
    }

    if (delegation.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'This delegation is already cancelled.' },
        { status: 400 },
      );
    }

    await db
      .update(approvalDelegations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: account.id,
      })
      .where(
        and(
          eq(approvalDelegations.id, delegationId),
          eq(approvalDelegations.delegatorUserId, account.id),
          eq(approvalDelegations.status, 'active'),
        ),
      );

    return NextResponse.json({
      success: true,
      message: 'The approval delegation has been cancelled.',
    });
  } catch (error) {
    console.error('PATCH approval delegation error:', error);

    return NextResponse.json(
      { success: false, message: 'Unable to cancel the approval delegation.' },
      { status: 500 },
    );
  }
}
