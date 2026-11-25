
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Users,
  Printer,
  TrendingUp,
  Clock3,
  Filter,
  UserCheck,
  FileCheck,
  MapPin,
} from 'lucide-react';

type CountItem = {
  name: string;
  value: number;
};

type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

type EmployeePerformance = {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  designation: string | null;
  section: string | null;
  totalJobCards: number;
  completedJobCards: number;
  completionRate: number;
};

type JobCardFlow = {
  id: number;
  jobCardNumber: string;
  workerName: string;
  employeeNumber: string;
  designation: string | null;
  jobDate: string | Date;
  submittedAt: string | Date | null;
  section: string | null;
  specificArea: string | null;
  morningWork: string;
  afternoonWork: string | null;
  defectsEncountered: string | null;
  employeeJobStatus: string | null;
  supervisorName: string | null;
  supervisorApprovedAt: string | Date | null;
  supervisorComments: string | null;
  supervisorWorkStatus: string | null;
  supervisorWorkAssessmentComments: string | null;
  supervisorAssessedAt: string | Date | null;
  hodName: string | null;
  hodApprovedAt: string | Date | null;
  hodComments: string | null;
  status: string;
  rejectionReason: string | null;
  rejectedAt: string | Date | null;
};

type ReportData = {
  success: boolean;
  message?: string;
  filters?: {
    from: string;
    to: string;
    section: string;
  };
  kpis?: {
    totalJobCards: number;
    submittedJobCards: number;
    completedJobCards: number;
    jobCompletionRate: number;
    supervisorPendingJobCards: number;
    supervisorApprovedJobCards: number;
    supervisorApprovalRate: number;
    hodPendingJobCards: number;
    hodApprovedJobCards: number;
    hodApprovalRate: number;
    rejectedJobCards: number;
    inProgressJobCards: number;
    onHoldJobCards: number;
    notCompletedJobCards: number;
    activeEmployees: number;
    totalSchedules: number;
    totalAssignments: number;
    completedAssignments: number;
    openSafetyReports: number;
    outstandingCorrectiveActions: number;
    overdueCorrectiveActions: number;
  };
  jobCards?: {
    byDate: CountItem[];
    byStatus: CountItem[];
    byWorkStatus: CountItem[];
    completionRate: number;
  };
  jobCardFlow?: JobCardFlow[];
  employeePerformance?: EmployeePerformance[];
  workSchedules?: {
    byStatus: CountItem[];
    assignmentStatuses: CountItem[];
  };
  safety?: {
    byType: CountItem[];
    bySeverity: CountItem[];
    byStatus: CountItem[];
  };
  correctiveActions?: {
    byStatus: CountItem[];
    overdue: number;
  };
};

function getLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const difference = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getDateRange(preset: DatePreset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (preset === 'today') {
    return {
      from: getLocalDate(today),
      to: getLocalDate(today),
    };
  }

  if (preset === 'yesterday') {
    return {
      from: getLocalDate(yesterday),
      to: getLocalDate(yesterday),
    };
  }

  if (preset === 'this_week') {
    return {
      from: getLocalDate(getWeekStart(today)),
      to: getLocalDate(today),
    };
  }

  if (preset === 'last_week') {
    const start = getWeekStart(today);
    start.setDate(start.getDate() - 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return {
      from: getLocalDate(start),
      to: getLocalDate(end),
    };
  }

  if (preset === 'last_7_days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    return {
      from: getLocalDate(start),
      to: getLocalDate(today),
    };
  }

  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  return {
    from: getLocalDate(start),
    to: getLocalDate(today),
  };
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return 'Not yet recorded';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
        Not recorded
      </span>
    );
  }

  const normalized = value.toLowerCase();

  let color = 'bg-gray-100 text-gray-700';

  if (
    normalized === 'completed' ||
    normalized === 'hod_approved'
  ) {
    color = 'bg-emerald-100 text-emerald-800';
  } else if (
    normalized === 'submitted' ||
    normalized === 'supervisor_approved' ||
    normalized === 'in_progress'
  ) {
    color = 'bg-blue-100 text-blue-800';
  } else if (
    normalized === 'on_hold' ||
    normalized === 'assigned'
  ) {
    color = 'bg-orange-100 text-orange-800';
  } else if (
    normalized === 'rejected' ||
    normalized === 'not_completed' ||
    normalized === 'cancelled'
  ) {
    color = 'bg-rose-100 text-rose-800';
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>
      {formatLabel(value)}
    </span>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon size={19} />
        </div>

        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function BarChart({
  items,
  emptyMessage = 'No records found for this period.',
}: {
  items: CountItem[];
  emptyMessage?: string;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return (
      <div className="flex min-h-36 items-center justify-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-gray-600">
              {formatLabel(item.name)}
            </span>
            <span className="font-bold tabular-nums text-gray-900">
              {formatNumber(item.value)}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
              style={{
                width: `${Math.max((item.value / maximum) * 100, item.value > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyActivityChart({ items }: { items: CountItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-gray-400">
        No job-card activity recorded for this period.
      </div>
    );
  }

  const maximum = Math.max(...items.map((item) => item.value), 1);
  const displayedItems = items.length > 31 ? items.slice(-31) : items;

  return (
    <div className="overflow-x-auto">
      <div className="flex h-52 min-w-full items-end gap-2 border-b border-gray-200 pb-2">
        {displayedItems.map((item) => {
          const height = Math.max(
            (item.value / maximum) * 100,
            item.value > 0 ? 4 : 0,
          );

          return (
            <div
              key={item.name}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${item.name}: ${item.value} job cards`}
            >
              <span className="text-[10px] font-semibold text-gray-500 opacity-0 transition group-hover:opacity-100">
                {item.value}
              </span>

              <div
                className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all duration-500"
                style={{
                  height: `${height}%`,
                  minHeight: item.value > 0 ? 4 : 0,
                }}
              />

              <span className="text-[9px] text-gray-400">
                {item.name.slice(8)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[10px] text-gray-400">
        Daily job-card activity - Hover over bars to see values
      </p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  tone: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'slate';
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-rose-50 text-rose-700',
    purple: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </p>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [section, setSection] = useState('');
  const [preset, setPreset] = useState<DatePreset>('last_30_days');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applyPreset = useCallback((selectedPreset: DatePreset) => {
    setPreset(selectedPreset);

    if (selectedPreset === 'custom') return;

    const dates = getDateRange(selectedPreset);
    setFrom(dates.from);
    setTo(dates.to);
  }, []);

  useEffect(() => {
    const dates = getDateRange('last_30_days');
    setFrom(dates.from);
    setTo(dates.to);
  }, []);

  const loadReports = useCallback(async () => {
    if (!from || !to || from > to) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ from, to });

      if (section.trim()) {
        params.set('section', section.trim());
      }

      const response = await fetch(`/api/reports?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const rawText = await response.text();

      if (!rawText) {
        throw new Error(
          `The server returned an empty response (HTTP ${response.status}).`,
        );
      }

      let result: ReportData;

      try {
        result = JSON.parse(rawText) as ReportData;
      } catch {
        console.error('[Reports API] Invalid response:', rawText);
        throw new Error('The server returned invalid JSON. Check the server terminal.');
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load reports.');
      }

      setData(result);
    } catch (err) {
      console.error('[Reports Fetch Error]:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.',
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, section]);

  useEffect(() => {
    if (from && to && from <= to) {
      void loadReports();
    }
  }, [from, to, loadReports]);

  const kpis = data?.kpis;
  const completionRate = kpis?.jobCompletionRate ?? 0;

  const employeePerformance = data?.employeePerformance ?? [];
  const jobCardFlow = data?.jobCardFlow ?? [];

  const quickDateOptions: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#123d2b] to-[#1c5a40] text-white shadow-md">
              <BarChart3 size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welfare Reports & Analytics
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                Performance, operations, approvals and safety overview
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Printer size={16} />
              Print report
            </button>

            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={loading || !from || !to || from > to}
              className="flex items-center gap-2 rounded-lg bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c5a40] disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#103624] via-[#155238] to-[#17644a] p-6 text-white shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-200">
                <Activity size={15} />
                Management insights
              </div>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Operational Performance
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">
                Monitor employee work, Job Card approvals, work schedules
                and workplace safety from one reporting centre.
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm md:min-w-48">
              <p className="text-xs text-emerald-100/70">
                Work completion rate
              </p>

              <p className="mt-2 text-4xl font-bold">
                {loading ? '—' : `${completionRate}%`}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all duration-500"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={17} className="text-emerald-700" />
            <h3 className="font-bold text-gray-900">Report filters</h3>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold text-gray-600">
              Quick date selection
            </p>

            <div className="flex flex-wrap gap-2">
              {quickDateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyPreset(option.value)}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                    preset === option.value
                      ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-500 hover:bg-emerald-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => applyPreset('custom')}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                  preset === 'custom'
                    ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-500 hover:bg-emerald-50'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                From date
              </span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setPreset('custom');
                  setFrom(event.target.value);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                To date
              </span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setPreset('custom');
                  setTo(event.target.value);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                Section
              </span>
              <input
                type="text"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                placeholder="All sections"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={loading || !from || !to || from > to}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays size={16} />
                Apply filters
              </button>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">
            Select Yesterday or Last Week to see all Job Cards recorded
            during that period. Custom Range allows you to select any dates.
            Section filtering applies to the selected period.
          </p>
        </section>

        {error && (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-rose-600" size={20} />
              <div>
                <h3 className="font-bold text-rose-800">
                  Unable to load reports
                </h3>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadReports()}
                  className="mt-3 text-sm font-semibold text-rose-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {loading && !data && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
            <p className="text-sm text-gray-500">
              Loading your reporting data...
            </p>
          </div>
        )}

        {data && (
          <>
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Executive KPIs
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Key performance indicators for the selected period
                  </p>
                </div>

                {loading && (
                  <span className="text-xs text-emerald-700">Updating...</span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard title="Total Job Cards" value={formatNumber(kpis?.totalJobCards)} subtitle="Recorded during selected period" icon={ClipboardList} tone="blue" />
                <KpiCard title="Submitted Job Cards" value={formatNumber(kpis?.submittedJobCards)} subtitle="Reports submitted by workers" icon={FileCheck} tone="purple" />
                <KpiCard title="Supervisor Pending" value={formatNumber(kpis?.supervisorPendingJobCards)} subtitle="Awaiting supervisor review" icon={Clock3} tone="orange" />
                <KpiCard title="Supervisor Approved" value={formatNumber(kpis?.supervisorApprovedJobCards)} subtitle={`${formatNumber(kpis?.supervisorApprovalRate)}% supervisor approval rate`} icon={UserCheck} tone="blue" />
                <KpiCard title="Pending HOD Approval" value={formatNumber(kpis?.hodPendingJobCards)} subtitle="Awaiting final HOD approval" icon={Clock3} tone="orange" />
                <KpiCard title="HOD Approved" value={formatNumber(kpis?.hodApprovedJobCards)} subtitle={`${formatNumber(kpis?.hodApprovalRate)}% HOD approval rate`} icon={CheckCircle2} tone="green" />
                <KpiCard title="Work Completed" value={formatNumber(kpis?.completedJobCards)} subtitle={`${formatNumber(completionRate)}% work completion rate`} icon={CheckCircle2} tone="green" />
                <KpiCard title="Work In Progress" value={formatNumber(kpis?.inProgressJobCards)} subtitle="Assessed by supervisors" icon={Activity} tone="blue" />
                <KpiCard title="Work On Hold" value={formatNumber(kpis?.onHoldJobCards)} subtitle="Awaiting further action" icon={Clock3} tone="orange" />
                <KpiCard title="Not Completed" value={formatNumber(kpis?.notCompletedJobCards)} subtitle="Work assessed as not completed" icon={AlertTriangle} tone="red" />
                <KpiCard title="Rejected Job Cards" value={formatNumber(kpis?.rejectedJobCards)} subtitle="Returned or rejected reports" icon={AlertTriangle} tone="red" />
                <KpiCard title="Active Employees" value={formatNumber(kpis?.activeEmployees)} subtitle="Active Welfare employees" icon={Users} tone="purple" />
                <KpiCard title="Work Schedules" value={formatNumber(kpis?.totalSchedules)} subtitle="Schedules in selected period" icon={CalendarDays} tone="orange" />
                <KpiCard title="Total Assignments" value={formatNumber(kpis?.totalAssignments)} subtitle="Employee task assignments" icon={ClipboardList} tone="blue" />
                <KpiCard title="Completed Assignments" value={formatNumber(kpis?.completedAssignments)} subtitle="Assignments marked completed" icon={CheckCircle2} tone="green" />
                <KpiCard title="Open Safety Reports" value={formatNumber(kpis?.openSafetyReports)} subtitle="Awaiting resolution or closure" icon={ShieldAlert} tone="red" />
                <KpiCard title="Outstanding Actions" value={formatNumber(kpis?.outstandingCorrectiveActions)} subtitle={`${formatNumber(kpis?.overdueCorrectiveActions)} overdue actions`} icon={Clock3} tone="slate" />
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Daily Job Card Activity" description="Number of Job Cards recorded each day" icon={TrendingUp}>
                <DailyActivityChart items={data.jobCards?.byDate ?? []} />
              </Panel>

              <Panel title="Job Card Workflow Status" description="Distribution by approval workflow status" icon={ClipboardList}>
                <BarChart items={data.jobCards?.byStatus ?? []} />
              </Panel>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Supervisor Work Assessment" description="Actual work progress assessed by supervisors" icon={Activity}>
                <BarChart items={data.jobCards?.byWorkStatus ?? []} emptyMessage="No supervisor work assessments recorded." />
              </Panel>

              <Panel title="Employee Performance" description="Job Card activity and work completion by employee" icon={Users}>
                {employeePerformance.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    No employee Job Card activity found for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                          <th className="pb-3 font-semibold">Employee</th>
                          <th className="pb-3 text-center font-semibold">Jobs</th>
                          <th className="pb-3 text-center font-semibold">Completed</th>
                          <th className="pb-3 text-right font-semibold">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeePerformance.map((employee) => (
                          <tr key={employee.employeeId} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-gray-800">{employee.employeeName}</p>
                              <p className="mt-1 text-[10px] text-gray-400">
                                {employee.employeeNumber}
                                {employee.section ? ` · ${employee.section}` : ''}
                              </p>
                            </td>
                            <td className="py-3 text-center font-semibold text-gray-700">{employee.totalJobCards}</td>
                            <td className="py-3 text-center font-semibold text-emerald-700">{employee.completedJobCards}</td>
                            <td className="py-3 text-right">
                              <span className="font-bold text-gray-900">{employee.completionRate}%</span>
                              <div className="mt-1 ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(employee.completionRate, 100)}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>

            <Panel
              title="Job Card Approval Flow"
              description="Worker submission, working location, work performed, supervisor assessment and final HOD approval"
              icon={FileCheck}
            >
              {jobCardFlow.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No Job Cards found for the selected reporting period.
                </div>
              ) : (
                <div className="space-y-5">
                  {jobCardFlow.map((card) => (
                    <article key={card.id} className="overflow-hidden rounded-xl border border-gray-200">
                      <div className="flex flex-col justify-between gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-bold text-gray-900">{card.jobCardNumber}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Job date: {formatDateTime(card.jobDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={card.status} />
                          <StatusBadge value={card.supervisorWorkStatus} />
                        </div>
                      </div>

                      <div className="grid gap-5 p-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              1. Worker / Submitted by
                            </p>
                            <p className="mt-1 font-semibold text-gray-900">{card.workerName}</p>
                            <p className="text-xs text-gray-500">
                              Employee No: {card.employeeNumber}
                              {card.designation ? ` · ${card.designation}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Submitted: {formatDateTime(card.submittedAt)}
                            </p>
                          </div>

                          <div className="border-t border-gray-100 pt-3">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              <MapPin size={13} />
                              2. Working location
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {card.section || 'Section not recorded'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Specific area: {card.specificArea || 'Not recorded'}
                            </p>
                          </div>

                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              3. Work performed
                            </p>
                            <p className="mt-2 text-xs font-semibold text-gray-700">
                              Morning work (7:00 AM – 12:00 PM)
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-700">
                              {card.morningWork || 'Not recorded'}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-gray-700">
                              Afternoon work (1:00 PM – 4:00 PM)
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-700">
                              {card.afternoonWork || 'Not recorded'}
                            </p>

                            {card.defectsEncountered && (
                              <div className="mt-3 rounded-lg bg-orange-50 p-3">
                                <p className="text-xs font-semibold text-orange-800">
                                  Defects / problems encountered
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-xs text-orange-900">
                                  {card.defectsEncountered}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">
                              4. Supervisor review and approval
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {card.supervisorName || 'Awaiting supervisor approval'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              Approval date and time:
                            </p>
                            <p className="text-xs font-semibold text-gray-800">
                              {formatDateTime(card.supervisorApprovedAt)}
                            </p>

                            {card.supervisorComments && (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                Comments: {card.supervisorComments}
                              </p>
                            )}

                            <div className="mt-3 border-t border-blue-100 pt-3">
                              <p className="text-xs font-semibold text-gray-700">
                                Supervisor's work assessment
                              </p>
                              <div className="mt-2">
                                <StatusBadge value={card.supervisorWorkStatus} />
                              </div>
                              {card.supervisorAssessedAt && (
                                <p className="mt-2 text-xs text-gray-600">
                                  Assessed: {formatDateTime(card.supervisorAssessedAt)}
                                </p>
                              )}
                              {card.supervisorWorkAssessmentComments && (
                                <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                  {card.supervisorWorkAssessmentComments}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                              5. Head of Department final approval
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {card.hodName || 'Awaiting HOD approval'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              Approval date and time:
                            </p>
                            <p className="text-xs font-semibold text-gray-800">
                              {formatDateTime(card.hodApprovedAt)}
                            </p>
                            {card.hodComments && (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                Comments: {card.hodComments}
                              </p>
                            )}
                          </div>

                          {card.status === 'rejected' && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                              <p className="text-xs font-bold text-rose-800">
                                Rejected / Returned
                              </p>
                              <p className="mt-1 text-xs text-rose-700">
                                {card.rejectionReason || 'No reason recorded'}
                              </p>
                              <p className="mt-2 text-xs text-rose-600">
                                {formatDateTime(card.rejectedAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Work Schedule Assignments" description="Progress of employee task assignments" icon={CalendarDays}>
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs text-blue-700">Total assignments</p>
                    <p className="mt-2 text-2xl font-bold text-blue-900">
                      {formatNumber(kpis?.totalAssignments)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-700">Completed assignments</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-900">
                      {formatNumber(kpis?.completedAssignments)}
                    </p>
                  </div>
                </div>
                <BarChart items={data.workSchedules?.assignmentStatuses ?? []} />
              </Panel>

              <Panel title="Work Schedule Status" description="Schedules by current status" icon={CalendarDays}>
                <BarChart items={data.workSchedules?.byStatus ?? []} />
              </Panel>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Safety Report Categories" description="Types of safety issues recorded" icon={ShieldAlert}>
                <BarChart items={data.safety?.byType ?? []} />
              </Panel>
              <Panel title="Safety Severity" description="Distribution of reported risk levels" icon={AlertTriangle}>
                <BarChart items={data.safety?.bySeverity ?? []} />
              </Panel>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Safety Report Status" description="Current progress of reported incidents and hazards" icon={Activity}>
                <BarChart items={data.safety?.byStatus ?? []} />
              </Panel>

              <Panel title="Corrective Action Tracking" description="Progress of actions raised from safety reports" icon={CheckCircle2}>
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs text-orange-700">Outstanding</p>
                    <p className="mt-2 text-2xl font-bold text-orange-900">
                      {formatNumber(kpis?.outstandingCorrectiveActions)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <p className="text-xs text-rose-700">Overdue</p>
                    <p className="mt-2 text-2xl font-bold text-rose-900">
                      {formatNumber(kpis?.overdueCorrectiveActions)}
                    </p>
                  </div>
                </div>
                <BarChart items={data.correctiveActions?.byStatus ?? []} />
              </Panel>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-gray-900">Reporting period</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    All figures are based on the selected reporting filters.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CalendarDays size={15} className="text-emerald-700" />
                  <span>{data.filters?.from} to {data.filters?.to}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          header button,
          input,
          label,
          section:has(input) {
            display: none !important;
          }

          main {
            background: white !important;
          }

          section,
          article {
            break-inside: avoid;
          }

          .shadow-sm,
          .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}
