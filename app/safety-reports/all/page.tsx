
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  Eye,
  Filter,
  Loader2,
} from 'lucide-react';

type SafetyReport = {
  id: number;
  reportNumber: string;
  reportDate: string;
  reportType: string;
  severity: string;
  title: string;
  description: string;
  farm?: string | null;
  section?: string | null;
  location?: string | null;
  status: string;
};

const categories: Record<string, string> = {
  hazard: 'Hazard',
  accident: 'Accident',
  injury: 'Injury',
  near_miss: 'Near Miss',
  equipment_defect: 'Equipment Defect',
};

const statuses: Record<string, string> = {
  open: 'Open',
  under_investigation: 'Under Investigation',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const severityStyles: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 ring-blue-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-orange-50 text-orange-700 ring-orange-200',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const statusStyles: Record<string, string> = {
  open: 'bg-rose-50 text-rose-700',
  under_investigation: 'bg-purple-50 text-purple-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
};

function formatDate(value: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

export default function SafetyReportsRegisterPage() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/safety-reports', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load safety reports.');
      }

      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while loading reports.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !term ||
        report.reportNumber?.toLowerCase().includes(term) ||
        report.title?.toLowerCase().includes(term) ||
        report.description?.toLowerCase().includes(term) ||
        report.farm?.toLowerCase().includes(term) ||
        report.section?.toLowerCase().includes(term) ||
        report.location?.toLowerCase().includes(term);

      const matchesCategory =
        category === 'all' || report.reportType === category;

      const matchesSeverity =
        severity === 'all' || report.severity === severity;

      const matchesStatus =
        status === 'all' || report.status === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSeverity &&
        matchesStatus
      );
    });
  }, [reports, search, category, severity, status]);

  const criticalCount = reports.filter(
    (report) => report.severity === 'critical',
  ).length;

  const openCount = reports.filter(
    (report) =>
      report.status === 'open' ||
      report.status === 'under_investigation' ||
      report.status === 'in_progress',
  ).length;

  const resolvedCount = reports.filter(
    (report) =>
      report.status === 'resolved' ||
      report.status === 'closed',
  ).length;

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/safety-reports"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="font-bold text-gray-900">Safety Reports Register</h1>
              <p className="text-xs text-gray-500">Workplace safety records</p>
            </div>
          </div>

          <Link
            href="/safety-reports/new"
            className="flex items-center gap-2 rounded-xl bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c5a40]"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">New Report</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-700">
            Safety & Defects Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Safety Reports
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Review, search and monitor reported workplace safety issues.
          </p>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Visible Reports</p>
              <ClipboardList className="text-gray-400" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{reports.length}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Active Reports</p>
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700">{openCount}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Critical Reports</p>
              <AlertTriangle className="text-rose-500" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-rose-700">{criticalCount}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Resolved / Closed</p>
              <ShieldCheck className="text-emerald-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700">{resolvedCount}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="font-bold text-gray-900">Report Register</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Showing {filteredReports.length} of {reports.length} visible reports
                </p>
              </div>

              <button
                type="button"
                onClick={loadReports}
                disabled={loading}
                className="flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 lg:self-auto"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative md:col-span-2 lg:col-span-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reports..."
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="all">All Categories</option>
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="all">All Severity Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statuses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 size={30} className="mb-3 animate-spin text-emerald-700" />
              <p className="text-sm">Loading safety reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Filter size={25} />
              </div>
              <h4 className="mt-4 font-bold text-gray-800">No reports found</h4>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                {reports.length === 0
                  ? 'There are no safety reports visible to your account yet.'
                  : 'Try changing your search or filters to find a report.'}
              </p>
              {reports.length === 0 && (
                <Link
                  href="/safety-reports/new"
                  className="mt-5 flex items-center gap-2 rounded-xl bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Create First Report
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Report</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Location</th>
                    <th className="px-5 py-4 font-semibold">Severity</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="transition hover:bg-gray-50/80">
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-rose-700">
                          {report.reportNumber}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-sm font-semibold text-gray-900">
                          {report.title}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {formatDate(report.reportDate)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {categories[report.reportType] || report.reportType}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        <p>{report.farm || '—'}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {[report.section, report.location].filter(Boolean).join(' · ') || 'Location not specified'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${severityStyles[report.severity] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                          {report.severity}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statuses[report.status] || report.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/safety-reports/${report.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <Eye size={15} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-5 text-center text-xs text-gray-400">
          Kentalya PLC · Welfare Management System
        </div>
      </div>
    </main>
  );
}
