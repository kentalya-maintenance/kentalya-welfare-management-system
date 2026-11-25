
import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  desc,
  eq,
  inArray,
  lte,
  gte,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  appUsers,
  employees,
  welfareJobCards,
  jobCardEquipment,
  approvalDelegations,
} from '@/db/schema';

import { getSession } from '@/lib/auth';
import {
  hasPermission,
  PERMISSIONS,
} from '@/lib/permissions';

// ============================================================
// TYPES AND CONSTANTS
// ============================================================

const WORK_STATUSES = [
  'completed',
  'in_progress',
  'on_hold',
  'not_completed',
] as const;

type SupervisorWorkStatus = (typeof WORK_STATUSES)[number];

// ============================================================
// HELPERS
// ============================================================

async function getActiveReviewer(userId: number) {
  const [account] = await db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      role: appUsers.role,
      isActive: appUsers.isActive,
    })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);

  if (!account || account.isActive !== 'yes') {
    return null;
  }

  return account;
}

async function getApproverNames(userIds: number[]) {
  const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];

  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const accounts = await db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      fullName: employees.fullName,
    })
    .from(appUsers)
    .leftJoin(
      employees,
      eq(appUsers.employeeId, employees.id),
    )
    .where(inArray(appUsers.id, uniqueIds));

  return new Map(
    accounts.map((account) => [
      account.id,
      account.fullName?.trim() || account.username,
    ]),
  );
}

function getKenyaDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function getActiveDelegations(delegateUserId: number) {
  const today = getKenyaDate();

  return db
    .select({
      id: approvalDelegations.id,
      delegatorUserId: approvalDelegations.delegatorUserId,
      delegatorRole: approvalDelegations.delegatorRole,
      startDate: approvalDelegations.startDate,
      endDate: approvalDelegations.endDate,
    })
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.delegateUserId, delegateUserId),
        eq(approvalDelegations.status, 'active'),
        lte(approvalDelegations.startDate, today),
        gte(approvalDelegations.endDate, today),
      ),
    );
}

function getDelegatedPermissions(
  delegations: Awaited<ReturnType<typeof getActiveDelegations>>,
) {
  return {
    canVerify: delegations.some((delegation) =>
      hasPermission(
        delegation.delegatorRole,
        PERMISSIONS.VERIFY_JOB_CARDS,
      ),
    ),
    canApprove: delegations.some((delegation) =>
      hasPermission(
        delegation.delegatorRole,
        PERMISSIONS.APPROVE_JOB_CARDS,
      ),
    ),
  };
}

async function getDelegatorName(delegatorUserId: number) {
  const [delegator] = await db
    .select({
      username: appUsers.username,
      fullName: employees.fullName,
    })
    .from(appUsers)
    .leftJoin(
      employees,
      eq(appUsers.employeeId, employees.id),
    )
    .where(eq(appUsers.id, delegatorUserId))
    .limit(1);

  return (
    delegator?.fullName?.trim() ||
    delegator?.username ||
    `Account ${delegatorUserId}`
  );
}

function delegationAuditComment(
  existingComments: string,
  delegatorName: string,
  delegationId: number,
) {
  const audit = `[Delegated authority: performed by the logged-in delegate on behalf of ${delegatorName}; delegation reference #${delegationId}.]`;

  return existingComments
    ? `${existingComments}\n\n${audit}`
    : audit;
}

// ============================================================
// GET /api/job-card-approvals
// LOAD APPROVAL INBOX
// ============================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in to continue.' },
        { status: 401 },
      );
    }

    const account = await getActiveReviewer(Number(session.userId));

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Your account is inactive or unavailable.' },
        { status: 403 },
      );
    }

    const directCanVerify = hasPermission(
      account.role,
      PERMISSIONS.VERIFY_JOB_CARDS,
    );

    const directCanApprove = hasPermission(
      account.role,
      PERMISSIONS.APPROVE_JOB_CARDS,
    );

    const activeDelegations = await getActiveDelegations(account.id);
    const delegatedPermissions = getDelegatedPermissions(activeDelegations);

    const canVerify = directCanVerify || delegatedPermissions.canVerify;
    const canApprove = directCanApprove || delegatedPermissions.canApprove;

    if (!canVerify && !canApprove) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to review Job Cards.',
        },
        { status: 403 },
      );
    }

    const allowedStatuses: ('submitted' | 'supervisor_approved')[] = [];

    if (canVerify) {
      allowedStatuses.push('submitted');
    }

    if (canApprove) {
      allowedStatuses.push('supervisor_approved');
    }

    const cards = await db
      .select({
        id: welfareJobCards.id,
        jobCardNumber: welfareJobCards.jobCardNumber,
        employeeId: welfareJobCards.employeeId,
        employeeName: welfareJobCards.employeeName,
        employeeNumber: welfareJobCards.employeeNumber,
        designation: welfareJobCards.designation,
        jobDate: welfareJobCards.jobDate,
        jobDescription: welfareJobCards.jobDescription,
        afterLunchWork: welfareJobCards.afterLunchWork,
        section: welfareJobCards.section,

        // Specific work area selected by the worker.
        specificArea: welfareJobCards.specificArea,

        defectsEncountered: welfareJobCards.defectsEncountered,
        status: welfareJobCards.status,
        submittedAt: welfareJobCards.submittedAt,

        supervisorApprovedBy: welfareJobCards.supervisorApprovedBy,
        supervisorApprovedAt: welfareJobCards.supervisorApprovedAt,
        supervisorComments: welfareJobCards.supervisorComments,

        supervisorWorkStatus: welfareJobCards.supervisorWorkStatus,
        supervisorWorkAssessmentComments:
          welfareJobCards.supervisorWorkAssessmentComments,
        supervisorAssessedBy: welfareJobCards.supervisorAssessedBy,
        supervisorAssessedAt: welfareJobCards.supervisorAssessedAt,

        hodApprovedBy: welfareJobCards.hodApprovedBy,
        hodApprovedAt: welfareJobCards.hodApprovedAt,
        hodComments: welfareJobCards.hodComments,

        createdAt: welfareJobCards.createdAt,
        department: employees.department,
      })
      .from(welfareJobCards)
      .innerJoin(
        employees,
        eq(welfareJobCards.employeeId, employees.id),
      )
      .where(
        and(
          inArray(welfareJobCards.status, allowedStatuses),
          eq(employees.department, 'Welfare'),
          eq(employees.status, 'active'),
        ),
      )
      .orderBy(desc(welfareJobCards.submittedAt));

    const cardIds = cards.map((card) => card.id);

    const equipmentRecords = cardIds.length > 0
      ? await db
          .select({
            id: jobCardEquipment.id,
            jobCardId: jobCardEquipment.jobCardId,
            equipmentName: jobCardEquipment.equipmentName,
            quantity: jobCardEquipment.quantity,
            remarks: jobCardEquipment.remarks,
            conditionOnIssue: jobCardEquipment.conditionOnIssue,
            conditionOnReturn: jobCardEquipment.conditionOnReturn,
          })
          .from(jobCardEquipment)
          .where(inArray(jobCardEquipment.jobCardId, cardIds))
      : [];

    const approverIds = cards.flatMap((card) => [
      card.supervisorApprovedBy,
      card.supervisorAssessedBy,
      card.hodApprovedBy,
    ]).filter(
      (id): id is number => typeof id === 'number' && id > 0,
    );

    const approverNames = await getApproverNames(approverIds);

    const jobCards = cards.map((card) => ({
      ...card,

      supervisorApprovedByName: card.supervisorApprovedBy
        ? approverNames.get(card.supervisorApprovedBy) || null
        : null,

      supervisorAssessedByName: card.supervisorAssessedBy
        ? approverNames.get(card.supervisorAssessedBy) || null
        : null,

      hodApprovedByName: card.hodApprovedBy
        ? approverNames.get(card.hodApprovedBy) || null
        : null,

      equipment: equipmentRecords.filter(
        (item) => item.jobCardId === card.id,
      ),
    }));

    return NextResponse.json({
      success: true,
      jobCards,
      total: jobCards.length,
      approvalAuthority: {
        directCanVerify,
        directCanApprove,
        delegatedCanVerify: delegatedPermissions.canVerify,
        delegatedCanApprove: delegatedPermissions.canApprove,
        activeDelegations: activeDelegations.map((delegation) => ({
          id: delegation.id,
          delegatorUserId: delegation.delegatorUserId,
          delegatorRole: delegation.delegatorRole,
          startDate: delegation.startDate,
          endDate: delegation.endDate,
        })),
      },
    });
  } catch (error) {
    console.error('[GET /api/job-card-approvals] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to retrieve Job Card approvals.' },
      { status: 500 },
    );
  }
}

// ============================================================
// PATCH /api/job-card-approvals
// APPROVE OR REJECT A JOB CARD
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in to continue.' },
        { status: 401 },
      );
    }

    const account = await getActiveReviewer(Number(session.userId));

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Your account is inactive or unavailable.' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const jobCardId = Number(body.jobCardId);
    const action = String(body.action || '').trim();
    const comments = String(body.comments || '').trim();

    const workStatus = String(body.workStatus || '').trim();
    const workAssessmentComments = String(
      body.workAssessmentComments || '',
    ).trim();

    if (!Number.isInteger(jobCardId) || jobCardId <= 0) {
      return NextResponse.json(
        { success: false, message: 'A valid Job Card ID is required.' },
        { status: 400 },
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid review action.' },
        { status: 400 },
      );
    }

    if (action === 'reject' && !comments) {
      return NextResponse.json(
        { success: false, message: 'Please provide a reason for rejection.' },
        { status: 400 },
      );
    }

    const [jobCard] = await db
      .select({
        id: welfareJobCards.id,
        status: welfareJobCards.status,
      })
      .from(welfareJobCards)
      .innerJoin(
        employees,
        eq(welfareJobCards.employeeId, employees.id),
      )
      .where(
        and(
          eq(welfareJobCards.id, jobCardId),
          eq(employees.department, 'Welfare'),
          eq(employees.status, 'active'),
        ),
      )
      .limit(1);

    if (!jobCard) {
      return NextResponse.json(
        { success: false, message: 'Job Card not found.' },
        { status: 404 },
      );
    }

    const directCanVerify = hasPermission(
      account.role,
      PERMISSIONS.VERIFY_JOB_CARDS,
    );

    const directCanApprove = hasPermission(
      account.role,
      PERMISSIONS.APPROVE_JOB_CARDS,
    );

    const activeDelegations = await getActiveDelegations(account.id);

    // ----------------------------------------------------------
    // SUPERVISOR REVIEW
    // submitted -> supervisor_approved or rejected
    // ----------------------------------------------------------

    if (jobCard.status === 'submitted') {
      const matchingDelegation = activeDelegations.find((delegation) =>
        hasPermission(
          delegation.delegatorRole,
          PERMISSIONS.VERIFY_JOB_CARDS,
        ),
      );

      const canPerformSupervisorReview =
        directCanVerify || Boolean(matchingDelegation);

      if (!canPerformSupervisorReview) {
        return NextResponse.json(
          {
            success: false,
            message: 'You are not authorised to verify this Job Card.',
          },
          { status: 403 },
        );
      }

      if (
        action === 'approve' &&
        !WORK_STATUSES.includes(workStatus as SupervisorWorkStatus)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Please select the work completion status before approving this Job Card.',
          },
          { status: 400 },
        );
      }

      let auditComments = comments || null;

      if (!directCanVerify && matchingDelegation) {
        const delegatorName = await getDelegatorName(
          matchingDelegation.delegatorUserId,
        );

        auditComments = delegationAuditComment(
          comments,
          delegatorName,
          matchingDelegation.id,
        );
      }

      const updateValues =
        action === 'approve'
          ? {
              status: 'supervisor_approved' as const,
              supervisorApprovedBy: account.id,
              supervisorApprovedAt: new Date(),
              supervisorComments: auditComments,
              supervisorWorkStatus: workStatus as SupervisorWorkStatus,
              supervisorWorkAssessmentComments:
                workAssessmentComments || null,
              supervisorAssessedBy: account.id,
              supervisorAssessedAt: new Date(),
            }
          : {
              status: 'rejected' as const,
              rejectedBy: account.id,
              rejectedAt: new Date(),
              rejectionReason: auditComments || comments,
            };

      const result = await db
        .update(welfareJobCards)
        .set(updateValues)
        .where(
          and(
            eq(welfareJobCards.id, jobCardId),
            eq(welfareJobCards.status, 'submitted'),
          ),
        );

      if (result[0].affectedRows === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'This Job Card has already been reviewed. Please refresh your inbox.',
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          action === 'approve'
            ? 'Job Card assessed and forwarded to the HOD.'
            : 'Job Card rejected. The worker must correct and resubmit it.',
        status: action === 'approve' ? 'supervisor_approved' : 'rejected',
        performedBy: account.username,
        delegated: !directCanVerify && Boolean(matchingDelegation),
        workStatus: action === 'approve' ? workStatus : null,
      });
    }

    // ----------------------------------------------------------
    // HOD REVIEW
    // supervisor_approved -> hod_approved or rejected
    // ----------------------------------------------------------

    if (jobCard.status === 'supervisor_approved') {
      const matchingDelegation = activeDelegations.find((delegation) =>
        hasPermission(
          delegation.delegatorRole,
          PERMISSIONS.APPROVE_JOB_CARDS,
        ),
      );

      const canPerformHodReview =
        directCanApprove || Boolean(matchingDelegation);

      if (!canPerformHodReview) {
        return NextResponse.json(
          {
            success: false,
            message: 'You are not authorised to give final HOD approval.',
          },
          { status: 403 },
        );
      }

      let auditComments = comments || null;

      if (!directCanApprove && matchingDelegation) {
        const delegatorName = await getDelegatorName(
          matchingDelegation.delegatorUserId,
        );

        auditComments = delegationAuditComment(
          comments,
          delegatorName,
          matchingDelegation.id,
        );
      }

      const updateValues =
        action === 'approve'
          ? {
              status: 'hod_approved' as const,
              hodApprovedBy: account.id,
              hodApprovedAt: new Date(),
              hodComments: auditComments,
            }
          : {
              status: 'rejected' as const,
              rejectedBy: account.id,
              rejectedAt: new Date(),
              rejectionReason: auditComments || comments,
            };

      const result = await db
        .update(welfareJobCards)
        .set(updateValues)
        .where(
          and(
            eq(welfareJobCards.id, jobCardId),
            eq(welfareJobCards.status, 'supervisor_approved'),
          ),
        );

      if (result[0].affectedRows === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'This Job Card has already been reviewed. Please refresh your inbox.',
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          action === 'approve'
            ? 'Job Card has received final HOD approval.'
            : 'Job Card rejected by HOD.',
        status: action === 'approve' ? 'hod_approved' : 'rejected',
        performedBy: account.username,
        delegated: !directCanApprove && Boolean(matchingDelegation),
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'You are not authorised to perform this action at the current approval stage.',
      },
      { status: 403 },
    );
  } catch (error) {
    console.error('[PATCH /api/job-card-approvals] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to process Job Card review.' },
      { status: 500 },
    );
  }
}
