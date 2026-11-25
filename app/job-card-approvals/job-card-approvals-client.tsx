
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardCheck,
  RefreshCw,
  Search,
  CalendarDays,
  MapPin,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

type EquipmentItem = {
  id: number;
  jobCardId: number;
  equipmentName: string;
  quantity: number;
  remarks: string | null;
  conditionOnIssue: string | null;
  conditionOnReturn: string | null;
};

type WorkStatus =
  | 'completed'
  | 'in_progress'
  | 'on_hold'
  | 'not_completed';

type JobCard = {
  id: number;
  jobCardNumber: string;
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  designation: string | null;
  jobDate: string;
  jobDescription: string;
  afterLunchWork: string | null;
  section: string | null;
  specificArea: string | null;
  defectsEncountered: string | null;
  status: string;
  submittedAt: string | null;
  supervisorComments: string | null;
  supervisorWorkStatus: WorkStatus | null;
  supervisorWorkAssessmentComments: string | null;
  supervisorAssessedBy: number | null;
  supervisorAssessedAt: string | null;
  hodComments: string | null;
  createdAt: string;
  department: string | null;
  equipment: EquipmentItem[];

  supervisorApprovedByName?: string | null;
  supervisorApprovedAt?: string | null;
  supervisorAssessedByName?: string | null;
  hodApprovedByName?: string | null;
  hodApprovedAt?: string | null;
};

type Props = {
  role: string;
  username: string;
  canVerify: boolean;
  canApprove: boolean;
};

const WORK_STATUS_OPTIONS: {
  value: WorkStatus;
  label: string;
}[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'not_completed', label: 'Not Completed' },
];

function getWorkStatusLabel(status: WorkStatus | null) {
  return WORK_STATUS_OPTIONS.find((item) => item.value === status)?.label
    || 'Not assessed';
}

function getWorkStatusStyle(status: WorkStatus | null) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    case 'on_hold':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    case 'not_completed':
      return 'bg-rose-50 text-rose-700 ring-rose-600/20';
    default:
      return 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }
}

export default function JobCardApprovalsClient({
  role,
  username,
  canVerify,
  canApprove,
}: Props) {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [comments, setComments] = useState('');
  const [workStatus, setWorkStatus] = useState<WorkStatus | ''>('');
  const [workAssessmentComments, setWorkAssessmentComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const isHodOnly = canApprove && !canVerify;

  const isSupervisorReview = selectedCard?.status === 'submitted';

  const pageTitle = isHodOnly
    ? 'HOD Final Approval'
    : canVerify && canApprove
      ? 'Job Card Approval Centre'
      : 'Supervisor Review Inbox';

  const pageDescription = isHodOnly
    ? 'Review Job Cards verified by Welfare supervisors and give final approval.'
    : 'Review daily work reports submitted by all active Welfare employees.';

  const loadJobCards = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await fetch('/api/job-card-approvals', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load Job Cards.');
      }

      setJobCards(data.jobCards || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load Job Card approvals.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobCards();
  }, [loadJobCards]);

  function openReview(card: JobCard) {
    setSelectedCard(card);
    setComments('');
    setWorkStatus('');
    setWorkAssessmentComments('');
    setError('');
  }

  function closeReview() {
    if (processing) return;

    setSelectedCard(null);
    setComments('');
    setWorkStatus('');
    setWorkAssessmentComments('');
  }

  async function handleReview(action: 'approve' | 'reject') {
    if (!selectedCard) return;

    if (action === 'reject' && !comments.trim()) {
      setError('Please enter a reason before rejecting this Job Card.');
      return;
    }

    if (
      action === 'approve' &&
      selectedCard.status === 'submitted' &&
      !workStatus
    ) {
      setError('Please select the work completion status before approving this Job Card.');
      return;
    }

    const confirmation =
      action === 'approve'
        ? 'Are you sure you want to approve this Job Card?'
        : 'Are you sure you want to reject this Job Card?';

    if (!window.confirm(confirmation)) return;

    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/job-card-approvals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobCardId: selectedCard.id,
          action,
          comments: comments.trim(),

          // These fields are used during supervisor verification.
          workStatus: selectedCard.status === 'submitted'
            ? workStatus
            : undefined,

          workAssessmentComments: selectedCard.status === 'submitted'
            ? workAssessmentComments.trim()
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Review action failed.');
      }

      setSelectedCard(null);
      setComments('');
      setWorkStatus('');
      setWorkAssessmentComments('');

      await loadJobCards(true);

      window.alert(data.message || 'Review completed successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to process this Job Card.',
      );
    } finally {
      setProcessing(false);
    }
  }

  const filteredCards = jobCards.filter((card) => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return true;

    return [
      card.jobCardNumber,
      card.employeeName,
      card.employeeNumber,
      card.designation || '',
      card.section || '',
      card.specificArea || '',
    ].some((value) => value.toLowerCase().includes(searchText));
  });

  function formatDate(value: string | null) {
    if (!value) return 'Not recorded';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Not recorded';

    return date.toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(value: string | null) {
    if (!value) return 'Not recorded';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Not recorded';

    return date.toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const statusLabel = isHodOnly
    ? 'Awaiting HOD approval'
    : 'Awaiting supervisor review';

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#123d2b] to-[#1c5a40] text-white shadow-md">
              <ClipboardCheck size={22} />
            </div>

            <div>
              <h1 className="text-sm font-bold text-gray-900 sm:text-base">
                Kentalya Welfare
              </h1>
              <p className="text-[11px] text-gray-500">
                Job Card Approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-gray-900">
                {username}
              </p>
              <p className="text-[10px] capitalize text-gray-500">
                {role.replaceAll('_', ' ')}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="mb-8 rounded-3xl bg-gradient-to-br from-[#0f3021] via-[#123d2b] to-[#0b2618] p-7 text-white shadow-xl sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-100">
                <ShieldCheck size={13} />
                Welfare review process
              </span>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                {pageTitle}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/80">
                {pageDescription}
              </p>
            </div>

            <div className="flex min-w-36 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <ClipboardCheck size={22} />
              </div>

              <div>
                <p className="text-2xl font-bold">{jobCards.length}</p>
                <p className="text-xs text-emerald-100/70">
                  Pending reviews
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isHodOnly
                ? 'Supervisor-approved reports'
                : 'Submitted work reports'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadJobCards(true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh inbox
          </button>
        </section>

        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee, Job Card number, section or specific area..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
            <p className="text-sm text-gray-500">
              Loading Job Card approvals...
            </p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={27} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-gray-900">
              {search ? 'No matching Job Cards' : 'Inbox is clear'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {search
                ? 'Try another employee name, employee number, Job Card number or working area.'
                : 'There are currently no Job Cards waiting for your review.'}
            </p>
          </div>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {filteredCards.map((card) => (
              <article
                key={card.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {card.jobCardNumber}
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-gray-900">
                      {card.employeeName}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {card.employeeNumber}
                      {card.designation ? ` · ${card.designation}` : ''}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-600/20">
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarDays size={16} className="shrink-0 text-gray-400" />
                    <span>{formatDate(card.jobDate)}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {card.section || 'Section not specified'}
                      </p>
                      <p className="mt-1 break-words text-xs text-emerald-700">
                        Specific area: {card.specificArea || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 px-5 pb-5">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Morning work · 7:00 AM–12:00 PM
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {card.jobDescription}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Evening work · 1:00 PM–4:00 PM
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {card.afterLunchWork || 'No evening work details recorded.'}
                    </p>
                  </div>

                  {card.defectsEncountered && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                        <AlertTriangle size={14} />
                        Defects / problems
                      </p>
                      <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                        {card.defectsEncountered}
                      </p>
                    </div>
                  )}

                  {card.supervisorWorkStatus && (
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Supervisor work assessment
                      </p>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getWorkStatusStyle(card.supervisorWorkStatus)}`}>
                        {getWorkStatusLabel(card.supervisorWorkStatus)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 p-4">
                  <span className="text-xs text-gray-500">
                    Submitted: {formatDate(card.submittedAt)}
                  </span>

                  <button
                    type="button"
                    onClick={() => openReview(card)}
                    className="flex items-center gap-2 rounded-lg bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c5a40]"
                  >
                    <Eye size={16} />
                    Review report
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          Kentalya PLC · Welfare Management System
        </footer>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {selectedCard.jobCardNumber}
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Review Daily Work Report
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedCard.employeeName} · {selectedCard.employeeNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReview}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close review"
              >
                <X size={21} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Work date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {formatDate(selectedCard.jobDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Designation
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedCard.designation || 'Not recorded'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Work section
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedCard.section || 'Not recorded'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">
                    Specific working area
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-emerald-900">
                    {selectedCard.specificArea || 'Not recorded'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <UserCheck size={17} className="text-emerald-700" />
                  Approval History
                </h3>

                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Senior Supervisor verification
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {selectedCard.supervisorApprovedByName || 'Pending supervisor verification'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(selectedCard.supervisorApprovedAt || null)}
                    </p>
                    {selectedCard.supervisorComments && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {selectedCard.supervisorComments}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Supervisor work assessment
                    </p>

                    <div className="mt-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getWorkStatusStyle(selectedCard.supervisorWorkStatus)}`}>
                        {getWorkStatusLabel(selectedCard.supervisorWorkStatus)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedCard.supervisorAssessedByName || 'Assessor not recorded'}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(selectedCard.supervisorAssessedAt || null)}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {selectedCard.supervisorWorkAssessmentComments || 'No work assessment comments recorded.'}
                    </p>
                  </div>

                  {selectedCard.hodApprovedByName && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500">
                        HOD final approval
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {selectedCard.hodApprovedByName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(selectedCard.hodApprovedAt || null)}
                      </p>
                      {selectedCard.hodComments && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {selectedCard.hodComments}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Clock size={17} className="text-emerald-700" />
                  Morning Work Details (7:00 AM–12:00 PM)
                </h3>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                  {selectedCard.jobDescription}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Clock size={17} className="text-emerald-700" />
                  Evening Work Details (1:00 PM–4:00 PM)
                </h3>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                  {selectedCard.afterLunchWork || 'No evening work details recorded.'}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Wrench size={17} className="text-emerald-700" />
                  Tools and Equipment Used
                </h3>

                <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {selectedCard.equipment?.length ? (
                    <div className="space-y-3">
                      {selectedCard.equipment.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">
                              {item.equipmentName}
                            </p>

                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Qty: {item.quantity}
                            </span>
                          </div>

                          {item.remarks && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                              {item.remarks}
                            </p>
                          )}

                          {item.conditionOnIssue && (
                            <p className="mt-2 text-xs text-gray-500">
                              Condition on issue: {item.conditionOnIssue}
                            </p>
                          )}

                          {item.conditionOnReturn && (
                            <p className="mt-1 text-xs text-gray-500">
                              Condition on return: {item.conditionOnReturn}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No tools or equipment were recorded.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <AlertTriangle size={17} className="text-amber-600" />
                  Defects / Problems Encountered
                </h3>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                  {selectedCard.defectsEncountered || 'No defects or problems reported.'}
                </div>
              </div>

              {isSupervisorReview && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <ClipboardCheck size={18} className="text-emerald-700" />
                    Supervisor Work Assessment
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Assess the actual work performed and select its current condition before forwarding the report to the HOD.
                  </p>

                  <label
                    htmlFor="work-status"
                    className="mt-4 block text-sm font-semibold text-gray-800"
                  >
                    Work completion status <span className="text-rose-600">*</span>
                  </label>

                  <select
                    id="work-status"
                    value={workStatus}
                    onChange={(event) =>
                      setWorkStatus(event.target.value as WorkStatus | '')
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select work status</option>
                    {WORK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label
                    htmlFor="work-assessment-comments"
                    className="mt-4 block text-sm font-semibold text-gray-800"
                  >
                    Supervisor assessment comments
                  </label>

                  <textarea
                    id="work-assessment-comments"
                    value={workAssessmentComments}
                    onChange={(event) =>
                      setWorkAssessmentComments(event.target.value)
                    }
                    rows={4}
                    placeholder="Explain the work condition, outstanding work, issues or action required by the HOD..."
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    These assessment comments will be visible to the HOD.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="review-comments"
                  className="flex items-center gap-2 text-sm font-bold text-gray-900"
                >
                  <MessageSquare size={17} className="text-emerald-700" />
                  Review Comments
                </label>

                <textarea
                  id="review-comments"
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  rows={4}
                  placeholder="Enter general review comments or a reason for rejection..."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  General comments are optional for approval but required for rejection.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:p-6">
              <button
                type="button"
                disabled={processing}
                onClick={closeReview}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Close
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleReview('reject')}
                  className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <XCircle size={17} />
                  Reject
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleReview('approve')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#123d2b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c5a40] disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
