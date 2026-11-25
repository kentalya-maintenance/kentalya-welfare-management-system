
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  ClipboardList,
  CalendarDays,
  User,
  Clock3,
  RefreshCw,
  FileText,
  ChevronRight,
  AlertCircle,
  Filter,
} from 'lucide-react';

type JobCard = {
  id: number;
  jobCardNumber: string;
  employeeName: string;
  employeeNumber: string;
  designation: string | null;
  jobDate: string;
  jobDescription: string;
  section: string | null;
  status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  language: 'en' | 'sw';
  createdAt: string;
};

const statusOptions = [
  { value: 'all', label: 'All Job Cards' },
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusStyle(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    case 'assigned':
      return 'bg-violet-50 text-violet-700 ring-violet-600/20';
    case 'cancelled':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  }
}

function formatStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string) {
  if (!value) return 'Date not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date not available';

  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadJobCards() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/job-cards', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load job cards.');
      }

      setJobCards(data.jobCards || []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while loading job cards.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobCards();
  }, []);

  const filteredJobCards = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return jobCards.filter((card) => {
      const matchesSearch =
        !searchTerm ||
        card.jobCardNumber?.toLowerCase().includes(searchTerm) ||
        card.employeeName?.toLowerCase().includes(searchTerm) ||
        card.employeeNumber?.toLowerCase().includes(searchTerm) ||
        card.jobDescription?.toLowerCase().includes(searchTerm);

      const matchesStatus =
        selectedStatus === 'all' || card.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [jobCards, search, selectedStatus]);

  const completedCount = jobCards.filter(
    (card) => card.status === 'completed',
  ).length;

  const activeCount = jobCards.filter(
    (card) => card.status === 'in_progress',
  ).length;

  const pendingCount = jobCards.filter(
    (card) => card.status === 'draft' || card.status === 'assigned',
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              title="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Job Cards
              </h1>
              <p className="text-xs text-slate-500">
                Welfare work management
              </p>
            </div>
          </div>

          <Link
            href="/job-cards/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Job Card</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page introduction */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-7 text-white shadow-xl sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-52 w-52 rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-50">
              <ClipboardList size={14} />
              Welfare Operations
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Employee Job Cards
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Create, assign and monitor employee work activities,
              equipment issued, working hours and completed tasks.
            </p>

            <Link
              href="/job-cards/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
            >
              <Plus size={17} />
              Create a Job Card
            </Link>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Job Cards
              </p>
              <span className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <FileText size={19} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {jobCards.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Records available</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pending
              </p>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <Clock3 size={19} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {pendingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Draft or assigned</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                In Progress
              </p>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <RefreshCw size={19} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Active work activities</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <ClipboardList size={19} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {completedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Finished job cards</p>
          </div>
        </section>

        {/* Job card records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Job Card Records
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Search and manage employee work records.
                </p>
              </div>

              <button
                onClick={loadJobCards}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search job card number, employee or P/No..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="relative md:w-56">
                <Filter
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw size={30} className="animate-spin text-emerald-600" />
                <p className="mt-4 text-sm font-medium text-slate-700">
                  Loading job cards...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle className="mx-auto text-red-600" size={30} />
                <p className="mt-3 font-semibold text-red-800">
                  Unable to load job cards
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={loadJobCards}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            ) : filteredJobCards.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ClipboardList size={30} />
                </div>

                <h4 className="mt-5 text-lg font-bold text-slate-900">
                  {jobCards.length === 0
                    ? 'No job cards created yet'
                    : 'No matching job cards'}
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {jobCards.length === 0
                    ? 'Start by creating the first employee job card.'
                    : 'Try changing your search or selected status.'}
                </p>

                {jobCards.length === 0 && (
                  <Link
                    href="/job-cards/new"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus size={17} />
                    Create First Job Card
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobCards.map((card) => (
                  <article
                    key={card.id}
                    className="group rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {card.jobCardNumber}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(card.status)}`}
                          >
                            {formatStatus(card.status)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {card.language === 'sw' ? 'Kiswahili' : 'English'}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <User size={15} className="text-slate-400" />
                            {card.employeeName}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <ClipboardList size={15} className="text-slate-400" />
                            P/No: {card.employeeNumber}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={15} className="text-slate-400" />
                            {formatDate(card.jobDate)}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                          {card.jobDescription}
                        </p>

                        {card.section && (
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            Section: {card.section}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/job-cards/${card.id}`}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition group-hover:border-emerald-300 group-hover:text-emerald-700 hover:bg-white"
                      >
                        View Details
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loading && !error && filteredJobCards.length > 0 && (
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Showing {filteredJobCards.length} of {jobCards.length} job cards
                (up to 100 most recent records).
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
