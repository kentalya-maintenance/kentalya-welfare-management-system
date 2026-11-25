
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  HeartHandshake,
  ClipboardList,
  ClipboardCheck,
  Users,
  CalendarDays,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  Clock3,
  ArrowUpRight,
  Sparkles,
  LayoutGrid,
  Activity,
  CheckCircle2,
} from 'lucide-react';

import { getSession, deleteSession } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import LanguageSwitcher from '@/app/components/language-switcher';

const modules = [
  {
    title: 'Job Cards',
    description: 'Submit daily work reports and record tools and equipment used.',
    icon: ClipboardList,
    gradient: 'from-blue-500 to-blue-600',
    status: 'Core module',
    href: '/job-cards',
  },
  {
    title: 'Job Card Approvals',
    description: 'Review, verify and approve daily Welfare employee job reports.',
    icon: ClipboardCheck,
    gradient: 'from-emerald-600 to-teal-700',
    status: 'Core module',
    href: '/job-card-approvals',
  },
  {
    title: 'Out of Office / Delegate Approval',
    description: 'Delegate approval authority during your absence.',
    icon: CalendarDays,
    gradient: 'from-cyan-600 to-blue-700',
    status: 'Core module',
    href: '/out-of-office',
  },
  {
    title: 'Employee Directory',
    description: 'View and manage employee information.',
    icon: Users,
    gradient: 'from-violet-500 to-purple-600',
    status: 'Core module',
    href: '/employees',
  },
  {
    title: 'Work Scheduling',
    description: 'Organise daily tasks and employee assignments.',
    icon: CalendarDays,
    gradient: 'from-orange-500 to-amber-600',
    status: 'Core module',
    href: '/work-schedules',
  },
  {
    title: 'Safety & Defects',
    description: 'Record safety issues, equipment defects and incidents.',
    icon: ShieldCheck,
    gradient: 'from-rose-500 to-red-600',
    status: 'Core module',
    href: '/safety-reports',
  },
  {
    title: 'Reports',
    description: 'Review job completion, employee performance and welfare analytics.',
    icon: BarChart3,
    gradient: 'from-emerald-500 to-teal-600',
    status: 'Core module',
    href: '/reports',
  },
  {
    title: 'Administration',
    description: 'Manage accounts, roles and system permissions.',
    icon: Settings,
    gradient: 'from-slate-600 to-gray-700',
    status: 'Administrator',
    href: '/admin/users',
  },
];

function getStatusStyle(status: string) {
  if (status === 'Core module') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
  }

  if (status === 'Planned') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
  }

  if (status === 'Administrator') {
    return 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20';
  }

  return 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20';
}

async function logoutAction() {
  'use server';

  await deleteSession();
  redirect('/login');
}

function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
        <p className="text-sm text-gray-500">
          Loading Welfare Dashboard...
        </p>
      </div>
    </main>
  );
}

async function DashboardContent() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const normalizedRole = String(session.role || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

  // Identify worker accounts.
  const isWorker = [
    'welfare_staff',
    'welfare_worker',
    'worker',
  ].includes(normalizedRole);

  // Identify accounts allowed to access Out of Office / Delegate Approval.
  const canManageDelegation = [
    'supervisor',
    'senior_supervisor',
    'senior_welfare_supervisor',
    'head_of_department',
    'head_department',
    'hod',
    'department_head',
    'director',
  ].includes(normalizedRole) ||
    normalizedRole.includes('senior_supervisor') ||
    normalizedRole.includes('director') ||
    normalizedRole.includes('head_of_department');

  const canViewJobCardApprovals =
    hasPermission(session.role, PERMISSIONS.VERIFY_JOB_CARDS) ||
    hasPermission(session.role, PERMISSIONS.APPROVE_JOB_CARDS);

  const canViewReports =
    hasPermission(session.role, PERMISSIONS.VIEW_REPORTS) ||
    hasPermission(session.role, PERMISSIONS.VIEW_DEPARTMENT_REPORTS);

  // Filter modules according to the logged-in user's role and permissions.
  const visibleModules = modules.filter((module) => {
    // Workers can ONLY see Job Cards and Safety & Defects.
    if (isWorker) {
      return (
        module.title === 'Job Cards' ||
        module.title === 'Safety & Defects'
      );
    }

    // Only workers can see the worker Job Cards module.
    if (module.title === 'Job Cards') {
      return false;
    }

    // Approval module requires verification or approval permission.
    if (module.title === 'Job Card Approvals') {
      return canViewJobCardApprovals;
    }

    // Out of Office is available to Supervisors, Senior Supervisors, HODs and Directors.
    if (module.title === 'Out of Office / Delegate Approval') {
      return canManageDelegation;
    }

    // Reports require the appropriate permission.
    if (module.title === 'Reports') {
      return canViewReports;
    }

    return true;
  });

  const totalModules = visibleModules.length;

  const liveModules = visibleModules.filter(
    (module) => module.status === 'Core module',
  ).length;

  const plannedModules = visibleModules.filter(
    (module) => module.status === 'Planned',
  ).length;

  const formattedRole = session.role.replaceAll('_', ' ');
  const initial = session.username?.[0]?.toUpperCase() ?? 'U';

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#123d2b] to-[#1c5a40] text-white shadow-md shadow-emerald-900/10">
              <HeartHandshake size={22} />
            </div>

            <div>
              <h1 className="text-sm font-bold text-gray-900 sm:text-base">
                Kentalya Welfare
              </h1>
              <p className="text-[11px] text-gray-500">
                Management System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitcher />

            <div className="hidden items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">
                {initial}
              </div>

              <div className="leading-tight">
                <p className="text-xs font-semibold text-gray-900">
                  {session.username}
                </p>
                <p className="text-[10px] capitalize text-gray-500">
                  {formattedRole}
                </p>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3021] via-[#123d2b] to-[#0b2618] p-8 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage:
                'radial-gradient(ellipse at top right, black 20%, transparent 70%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at top right, black 20%, transparent 70%)',
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-100 backdrop-blur-sm">
                <Sparkles size={12} />
                Welfare Management Portal
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back, {session.username}
              </h2>

              <p className="mt-3 text-sm leading-6 text-emerald-100/80 sm:text-base">
                Manage employee welfare activities, daily work reports,
                equipment and workplace support from one central system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-bold capitalize">
                  {formattedRole}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">
                  Account ID
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {session.userId}
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">
                  System Status
                </p>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>

                  <p className="text-sm font-semibold text-emerald-50">
                    All systems operational
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <LayoutGrid size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-gray-900">
                {totalModules}
              </p>
              <p className="mt-1 text-xs text-gray-500">Total modules</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-gray-900">
                {liveModules}
              </p>
              <p className="mt-1 text-xs text-gray-500">Live now</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-gray-900">
                {plannedModules}
              </p>
              <p className="mt-1 text-xs text-gray-500">In planning</p>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              System Modules
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Access the different areas of the Welfare Management System.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm ring-1 ring-gray-200">
            <Clock3 size={13} />
            Welfare operations portal
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((module) => {
            const Icon = module.icon;

            const cardContent = (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/0 transition-all duration-300 group-hover:from-emerald-50/60 group-hover:to-transparent"
                />

                <div className="relative flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${module.gradient} text-white shadow-md shadow-gray-900/10`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusStyle(module.status)}`}
                    >
                      {module.status}
                    </span>

                    <ArrowUpRight
                      size={17}
                      className="text-gray-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600"
                    />
                  </div>
                </div>

                <h3 className="relative mt-5 text-lg font-bold text-gray-900">
                  {module.title}
                </h3>

                <p className="relative mt-2 min-h-12 text-sm leading-6 text-gray-500">
                  {module.description}
                </p>

                <div className="relative mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} />
                  Open module
                </div>
              </>
            );

            const cardClassName =
              'group relative block overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5';

            return (
              <Link
                key={module.title}
                href={module.href}
                className={cardClassName}
              >
                {cardContent}
              </Link>
            );
          })}
        </section>

        <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-gray-200 py-6 text-xs text-gray-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#123d2b] text-white">
              <HeartHandshake size={12} />
            </div>

            <span className="font-medium text-gray-500">
              Kentalya PLC · Welfare Management System
            </span>
          </div>

          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </footer>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
