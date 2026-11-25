
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  appUsers,
  employees,
  welfareJobCards,
  workSchedules,
  workScheduleAssignments,
  safetyReports,
  safetyCorrectiveActions,
} from '@/db/schema';
import { getSession } from '@/lib/auth';

function dateKey(value: Date | string | null | undefined): string {
  if (!value) return '';

  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }

  return String(value).slice(0, 10);
}

function isWithinPeriod(
  value: Date | string | null | undefined,
  from: string,
  to: string,
) {
  const key = dateKey(value);

  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;

  return true;
}

function countBy(items: Array<{ [key: string]: any }>, field: string) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const value = String(item[field] || 'unknown');
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getApproverName(
  userId: number | null | undefined,
  usersById: Map<number, (typeof appUsers.$inferSelect)>,
  employeesById: Map<number, (typeof employees.$inferSelect)>,
) {
  if (!userId) return null;

  const user = usersById.get(Number(userId));
  if (!user) return null;

  const employee = user.employeeId
    ? employeesById.get(user.employeeId)
    : undefined;

  return employee?.fullName || user.username || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authorised to view reports.',
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const section = (searchParams.get('section') || '').trim();

    if (from && to && from > to) {
      return NextResponse.json(
        {
          success: false,
          message: 'The start date cannot be after the end date.',
        },
        { status: 400 },
      );
    }

    const [
      allJobCards,
      allEmployees,
      allUsers,
      allSchedules,
      allAssignments,
      allSafetyReports,
      allCorrectiveActions,
    ] = await Promise.all([
      db.select().from(welfareJobCards),
      db.select().from(employees),
      db.select().from(appUsers),
      db.select().from(workSchedules),
      db.select().from(workScheduleAssignments),
      db.select().from(safetyReports),
      db.select().from(safetyCorrectiveActions),
    ]);

    const usersById = new Map(
      allUsers.map((user) => [user.id, user]),
    );

    const employeesById = new Map(
      allEmployees.map((employee) => [employee.id, employee]),
    );

    const sectionMatches = (
      recordSection: string | null | undefined,
    ) => {
      if (!section) return true;

      return (
        String(recordSection || '').toLowerCase() ===
        section.toLowerCase()
      );
    };

    // --------------------------------------------------------
    // JOB CARDS
    // --------------------------------------------------------

    const filteredJobCards = allJobCards.filter((card) => {
      return (
        isWithinPeriod(card.jobDate, from, to) &&
        sectionMatches(card.section)
      );
    });

    const totalJobCards = filteredJobCards.length;

    // A submitted report remains submitted for reporting purposes
    // even after supervisor approval, HOD approval or rejection.
    const submittedJobCardRecords = filteredJobCards.filter(
      (card) =>
        card.status !== 'draft' &&
        card.status !== 'assigned',
    );

    // IMPORTANT: Return a number to the frontend, not an array.
    const submittedJobCards = submittedJobCardRecords.length;

    const supervisorPendingJobCards = filteredJobCards.filter(
      (card) => card.status === 'submitted',
    ).length;

    const supervisorApprovedJobCards = filteredJobCards.filter(
      (card) =>
        card.status === 'supervisor_approved' ||
        card.status === 'hod_approved',
    ).length;

    const hodPendingJobCards = filteredJobCards.filter(
      (card) => card.status === 'supervisor_approved',
    ).length;

    const hodApprovedJobCards = filteredJobCards.filter(
      (card) => card.status === 'hod_approved',
    ).length;

    const rejectedJobCards = filteredJobCards.filter(
      (card) => card.status === 'rejected',
    ).length;

    const completedJobCards = filteredJobCards.filter(
      (card) =>
        card.supervisorWorkStatus === 'completed' ||
        card.status === 'completed',
    ).length;

    const inProgressJobCards = filteredJobCards.filter(
      (card) => card.supervisorWorkStatus === 'in_progress',
    ).length;

    const onHoldJobCards = filteredJobCards.filter(
      (card) => card.supervisorWorkStatus === 'on_hold',
    ).length;

    const notCompletedJobCards = filteredJobCards.filter(
      (card) => card.supervisorWorkStatus === 'not_completed',
    ).length;

    const jobCompletionRate =
      totalJobCards > 0
        ? Math.round((completedJobCards / totalJobCards) * 100)
        : 0;

    const supervisorApprovalRate =
      submittedJobCards > 0
        ? Math.round(
            (supervisorApprovedJobCards / submittedJobCards) * 100,
          )
        : 0;

    const hodApprovalRate =
      submittedJobCards > 0
        ? Math.round(
            (hodApprovedJobCards / submittedJobCards) * 100,
          )
        : 0;

    // Daily Job Card activity.
    const byDateMap = new Map<string, number>();

    for (const card of filteredJobCards) {
      const key = dateKey(card.jobDate);
      if (!key) continue;

      byDateMap.set(key, (byDateMap.get(key) || 0) + 1);
    }

    const byDate = Array.from(byDateMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const byStatus = countBy(
      filteredJobCards as Array<{ [key: string]: any }>,
      'status',
    );

    const byWorkStatus = countBy(
      filteredJobCards
        .filter((card) => card.supervisorWorkStatus)
        .map((card) => ({
          status: card.supervisorWorkStatus,
        })),
      'status',
    );

    // Employee Job Card performance.
    const empPerfMap = new Map<
      number,
      { total: number; completed: number }
    >();

    for (const card of filteredJobCards) {
      if (!card.employeeId) continue;

      if (!empPerfMap.has(card.employeeId)) {
        empPerfMap.set(card.employeeId, {
          total: 0,
          completed: 0,
        });
      }

      const stats = empPerfMap.get(card.employeeId)!;
      stats.total += 1;

      if (
        card.supervisorWorkStatus === 'completed' ||
        card.status === 'completed'
      ) {
        stats.completed += 1;
      }
    }

    const employeePerformance = Array.from(empPerfMap.entries())
      .map(([employeeId, stats]) => {
        const employee = employeesById.get(employeeId);

        return {
          employeeId,
          employeeName: employee?.fullName || 'Unknown Employee',
          employeeNumber: employee?.employeeNumber || 'N/A',
          designation: employee?.designation || null,
          section: employee?.section || null,
          totalJobCards: stats.total,
          completedJobCards: stats.completed,
          completionRate:
            stats.total > 0
              ? Math.round((stats.completed / stats.total) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.totalJobCards - a.totalJobCards);

    // Complete worker-to-approval history.
    const jobCardFlow = filteredJobCards
      .map((card) => {
        const supervisorUserId =
          card.supervisorApprovedBy || card.supervisorAssessedBy;

        const supervisorName = getApproverName(
          supervisorUserId,
          usersById,
          employeesById,
        );

        const hodName = getApproverName(
          card.hodApprovedBy,
          usersById,
          employeesById,
        );

        return {
          id: card.id,
          jobCardNumber: card.jobCardNumber,

          workerName: card.employeeName,
          employeeNumber: card.employeeNumber,
          designation: card.designation,

          jobDate: card.jobDate,
          submittedAt: card.submittedAt,

          section: card.section,
          specificArea: card.specificArea,

          morningWork: card.jobDescription,
          afternoonWork: card.afterLunchWork,
          defectsEncountered: card.defectsEncountered,

          employeeJobStatus: card.employeeJobStatus,

          supervisorName,
          supervisorApprovedAt: card.supervisorApprovedAt,
          supervisorComments: card.supervisorComments,

          supervisorWorkStatus: card.supervisorWorkStatus,
          supervisorWorkAssessmentComments:
            card.supervisorWorkAssessmentComments,
          supervisorAssessedAt: card.supervisorAssessedAt,

          hodName,
          hodApprovedAt: card.hodApprovedAt,
          hodComments: card.hodComments,

          status: card.status,

          rejectionReason: card.rejectionReason,
          rejectedAt: card.rejectedAt,
        };
      })
      .sort((a, b) => {
        return (
          new Date(b.jobDate).getTime() -
          new Date(a.jobDate).getTime()
        );
      });

    // --------------------------------------------------------
    // EMPLOYEES
    // --------------------------------------------------------

    const activeEmployees = allEmployees.filter((employee) => {
      return (
        employee.status === 'active' &&
        employee.department?.toLowerCase() === 'welfare' &&
        sectionMatches(employee.section)
      );
    }).length;

    // --------------------------------------------------------
    // WORK SCHEDULES AND ASSIGNMENTS
    // --------------------------------------------------------

    const filteredSchedules = allSchedules.filter((schedule) => {
      return (
        isWithinPeriod(schedule.scheduleDate, from, to) &&
        sectionMatches(schedule.section)
      );
    });

    const scheduleIds = new Set(
      filteredSchedules.map((schedule) => schedule.id),
    );

    const filteredAssignments = allAssignments.filter((assignment) =>
      scheduleIds.has(assignment.scheduleId),
    );

    const completedAssignments = filteredAssignments.filter(
      (assignment) => assignment.status === 'completed',
    ).length;

    const scheduleByStatus = countBy(
      filteredSchedules as Array<{ [key: string]: any }>,
      'status',
    );

    const assignmentStatuses = countBy(
      filteredAssignments as Array<{ [key: string]: any }>,
      'status',
    );

    // --------------------------------------------------------
    // SAFETY REPORTS
    // --------------------------------------------------------

    const filteredSafetyReports = allSafetyReports.filter((report) => {
      return (
        isWithinPeriod(report.reportDate, from, to) &&
        sectionMatches(report.section)
      );
    });

    const safetyReportIds = new Set(
      filteredSafetyReports.map((report) => report.id),
    );

    const openSafetyReports = filteredSafetyReports.filter(
      (report) =>
        report.status !== 'resolved' &&
        report.status !== 'closed',
    ).length;

    const safetyByType = countBy(
      filteredSafetyReports as Array<{ [key: string]: any }>,
      'reportType',
    );

    const safetyBySeverity = countBy(
      filteredSafetyReports as Array<{ [key: string]: any }>,
      'severity',
    );

    const safetyByStatus = countBy(
      filteredSafetyReports as Array<{ [key: string]: any }>,
      'status',
    );

    // --------------------------------------------------------
    // CORRECTIVE ACTIONS
    // --------------------------------------------------------

    const filteredCorrectiveActions = allCorrectiveActions.filter(
      (action) => safetyReportIds.has(action.reportId),
    );

    const outstandingCorrectiveActions =
      filteredCorrectiveActions.filter(
        (action) =>
          action.status !== 'completed' &&
          action.status !== 'cancelled',
      ).length;

    const now = new Date();

    const overdueCorrectiveActions =
      filteredCorrectiveActions.filter((action) => {
        return (
          action.status !== 'completed' &&
          action.status !== 'cancelled' &&
          action.dueDate !== null &&
          action.dueDate !== undefined &&
          new Date(action.dueDate).getTime() < now.getTime()
        );
      }).length;

    const correctiveActionStatuses = countBy(
      filteredCorrectiveActions as Array<{ [key: string]: any }>,
      'status',
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json({
      success: true,

      filters: {
        from,
        to,
        section,
      },

      kpis: {
        totalJobCards,
        submittedJobCards,
        completedJobCards,
        jobCompletionRate,

        supervisorPendingJobCards,
        supervisorApprovedJobCards,
        supervisorApprovalRate,

        hodPendingJobCards,
        hodApprovedJobCards,
        hodApprovalRate,

        rejectedJobCards,

        inProgressJobCards,
        onHoldJobCards,
        notCompletedJobCards,

        activeEmployees,

        totalSchedules: filteredSchedules.length,
        totalAssignments: filteredAssignments.length,
        completedAssignments,

        openSafetyReports,

        outstandingCorrectiveActions,
        overdueCorrectiveActions,
      },

      jobCards: {
        byDate,
        byStatus,
        byWorkStatus,
        completionRate: jobCompletionRate,
      },

      jobCardFlow,

      employeePerformance,

      workSchedules: {
        byStatus: scheduleByStatus,
        assignmentStatuses,
      },

      safety: {
        byType: safetyByType,
        bySeverity: safetyBySeverity,
        byStatus: safetyByStatus,
      },

      correctiveActions: {
        byStatus: correctiveActionStatuses,
        overdue: overdueCorrectiveActions,
      },
    });
  } catch (error) {
    console.error('[GET /api/reports] error:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to load reports.',
      },
      { status: 500 },
    );
  }
}
