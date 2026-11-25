
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  ClipboardList,
  Clock3,
  CheckCircle2,
  Plus,
  Activity,
  Wrench,
  HeartPulse,
  Flame,
  Eye,
} from 'lucide-react';
import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
export const instant = false;

import { getSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS, ROLES } from '@/lib/permissions';
import { db } from '@/db';
import {
  safetyReports,
  employees,
  employeeSupervisorAssignments,
} from '@/db/schema';

async function getStatistics(session: {
  userId: number;
  employeeId: number | null;
  role: string;
}) {
  const conditions = [];

  const canViewAll =
    hasPermission(session.role, PERMISSIONS.VIEW_ALL_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS);

  if (!canViewAll) {
    if (
      hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS) &&
      session.employeeId
    ) {
      const supervisedEmployeeIds = db
        .select({
          employeeId: employeeSupervisorAssignments.employeeId,
        })
        .from(employeeSupervisorAssignments)
        .where(
          eq(
            employeeSupervisorAssignments.supervisorEmployeeId,
            session.employeeId,
          ),
        );

      conditions.push(
        or(
          eq(safetyReports.reportedByUserId, session.userId),
          inArray(safetyReports.reportedByEmployeeId, supervisedEmployeeIds),
          inArray(safetyReports.assignedToEmployeeId, supervisedEmployeeIds),
          eq(safetyReports.assignedToEmployeeId, session.employeeId),
        )!,
      );
    } else {
      const ownConditions = [
        eq(safetyReports.reportedByUserId, session.userId),
      ];

      if (session.employeeId) {
        ownConditions.push(
          eq(safetyReports.reportedByEmployeeId, session.employeeId),
        );
      }

      conditions.push(or(...ownConditions)!);
    }
  }

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;

  const [
    totalResult,
    openResult,
    investigationResult,
    resolvedResult,
    criticalResult,
  ] = await Promise.all([
    db.select({ total: count() }).from(safetyReports).where(whereCondition),
    db
      .select({ total: count() })
      .from(safetyReports)
      .where(
        whereCondition
          ? and(whereCondition, eq(safetyReports.status, 'open'))
          : eq(safetyReports.status, 'open'),
      ),
    db
      .select({ total: count() })
      .from(safetyReports)
      .where(
        whereCondition
          ? and(
              whereCondition,
              eq(safetyReports.status, 'under_investigation'),
            )
          : eq(safetyReports.status, 'under_investigation'),
      ),
    db
      .select({ total: count() })
      .from(safetyReports)
      .where(
        whereCondition
          ? and(whereCondition, eq(safetyReports.status, 'resolved'))
          : eq(safetyReports.status, 'resolved'),
      ),
    db
      .select({ total: count() })
      .from(safetyReports)
      .where(
        whereCondition
          ? and(whereCondition, eq(safetyReports.severity, 'critical'))
          : eq(safetyReports.severity, 'critical'),
      ),
  ]);

  return {
    total: Number(totalResult[0]?.total ?? 0),
    open: Number(openResult[0]?.total ?? 0),
    investigation: Number(investigationResult[0]?.total ?? 0),
    resolved: Number(resolvedResult[0]?.total ?? 0),
    critical: Number(criticalResult[0]?.total ?? 0),
  };
}

const quickLinks = [
  {
    title: 'Hazard Reports',
    description: 'Unsafe conditions and potential workplace risks.',
    icon: AlertTriangle,
    color: 'bg-amber-50 text-amber-700',
    type: 'hazard',
  },
  {
    title: 'Accidents & Injuries',
    description: 'Record workplace accidents and employee injuries.',
    icon: HeartPulse,
    color: 'bg-rose-50 text-rose-700',
    type: 'accident',
  },
  {
    title: 'Near Misses',
    description: 'Record incidents that could have caused harm.',
    icon: Eye,
    color: 'bg-violet-50 text-violet-700',
    type: 'near_miss',
  },
  {
    title: 'Equipment Defects',
    description: 'Report faulty equipment requiring attention.',
    icon: Wrench,
    color: 'bg-blue-50 text-blue-700',
    type: 'equipment_defect',
  },
];

export default async function SafetyReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const canView =
    hasPermission(session.role, PERMISSIONS.VIEW_ALL_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_OWN_SAFETY_REPORTS);

  if (!canView) {
    redirect('/dashboard');
  }

  const stats = await getStatistics({
    userId: session.userId,
    employeeId: session.employeeId,
    role: session.role,
  });

  const statisticCards = [
    {
      title: 'Total Reports',
      value: stats.total,
      description: 'All reports visible to you',
      icon: ClipboardList,
      style: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Open Reports',
      value: stats.open,
      description: 'Awaiting investigation',
      icon: AlertTriangle,
      style: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Under Investigation',
      value: stats.investigation,
      description: 'Currently being addressed',
      icon: Activity,
      style: 'bg-violet-50 text-violet-700',
    },
    {
      title: 'Resolved Reports',
      value: stats.resolved,
      description: 'Successfully resolved',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700',
    },
  ];

  const canCreate = hasPermission(
    session.role,
    PERMISSIONS.CREATE_SAFETY_REPORTS,
  );

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-base font-bold text-gray-900">
                Safety & Defects
              </h1>
              <p className="text-xs text-gray-500">
                Workplace safety management
              </p>
            </div>
          </div>

          {canCreate && (
            <Link
              href="/safety-reports/new"
              className="flex items-center gap-2 rounded-xl bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1c5a40]"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">New Report</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#281b23] via-[#4a202b] to-[#25151b] p-7 text-white shadow-xl sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-100">
                <ShieldCheck size={13} />
                Workplace Safety
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Safety & Defects Management
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-rose-100/80">
                Identify hazards, report incidents, monitor equipment defects
                and track corrective actions to maintain a safer workplace.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm lg:min-w-56">
              <div className="flex items-center gap-2 text-rose-200">
                <Flame size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Critical Reports
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold tabular-nums">
                {stats.critical}
              </p>
              <p className="mt-1 text-xs text-rose-100/70">
                Require urgent attention
              </p>
            </div>
          </div>
        </section>

        <section className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statisticCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.style}`}
                  >
                    <Icon size={21} />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Live
                  </span>
                </div>

                <p className="mt-5 text-3xl font-bold tabular-nums text-gray-900">
                  {item.value}
                </p>

                <h3 className="mt-1 text-sm font-semibold text-gray-800">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  {item.description}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mb-9">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Report Categories
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select a category when creating a new safety report.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={
                    canCreate
                      ? `/safety-reports/new?type=${item.type}`
                      : '/safety-reports/all'
                  }
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}
                    >
                      <Icon size={21} />
                    </div>

                    <ArrowRight
                      size={17}
                      className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-rose-600"
                    />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-gray-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  Safety Reports Register
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  View and track recorded reports.
                </p>
              </div>
            </div>

            <Link
              href="/safety-reports/all"
              className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              View All Reports
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock3 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  Corrective Actions
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Follow up on actions assigned to address reported issues.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500">
              Corrective actions are managed within each safety report.
            </div>
          </div>
        </section>

        <footer className="mt-12 flex items-center justify-between border-t border-gray-200 py-6 text-xs text-gray-400">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition hover:text-emerald-700"
          >
            <ArrowLeft size={14} />
            Return to Dashboard
          </Link>

          <span>Kentalya PLC · Welfare Management System</span>
        </footer>
      </div>
    </main>
  );
}
