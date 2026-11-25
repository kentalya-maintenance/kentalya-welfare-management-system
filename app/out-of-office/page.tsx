
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  UserRound,
  XCircle,
  Send,
  RefreshCw,
} from 'lucide-react';

type Delegate = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  designation: string | null;
};

type Delegation = {
  id: number;
  delegatorUserId: number;
  delegateUserId: number;
  delegatorRole: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'active' | 'cancelled';
  createdAt: string;
  cancelledAt: string | null;
  isMyDelegation: boolean;
  isDelegatedToMe: boolean;
  delegator: {
    username: string;
    fullName: string;
    role: string;
    designation: string | null;
  } | null;
  delegate: {
    username: string;
    fullName: string;
    role: string;
    designation: string | null;
  } | null;
};

function formatRole(role: string) {
  return role
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  if (!value) return '—';

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function OutOfOfficePage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [canCreate, setCanCreate] = useState(false);

  const [delegateUserId, setDelegateUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/approval-delegations', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load delegation records.');
      }

      setDelegates(data.eligibleDelegates || []);
      setDelegations(data.delegations || []);
      setCanCreate(Boolean(data.canCreateDelegation));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load delegation records.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!delegateUserId || !startDate || !endDate) {
      setError('Please select a delegate and enter both dates.');
      return;
    }

    if (endDate < startDate) {
      setError('The end date cannot be before the start date.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/approval-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegateUserId: Number(delegateUserId),
          startDate,
          endDate,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to create delegation.');
      }

      setMessage(data.message || 'Delegation created successfully.');
      setDelegateUserId('');
      setStartDate('');
      setEndDate('');
      setReason('');

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to create delegation.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelDelegation(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this approval delegation?',
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      setCancellingId(id);

      const response = await fetch('/api/approval-delegations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to cancel delegation.');
      }

      setMessage(data.message || 'Delegation cancelled.');
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to cancel delegation.',
      );
    } finally {
      setCancellingId(null);
    }
  }

  const myDelegations = delegations.filter((item) => item.isMyDelegation);
  const receivedDelegations = delegations.filter(
    (item) => item.isDelegatedToMe,
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="mb-8 rounded-2xl bg-emerald-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <CalendarDays size={26} />
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Out of Office / Delegate Approval
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                Delegate your approval authority to another authorised
                supervisor or manager for a specified period.
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 size={20} className="shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <XCircle size={20} className="shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
            <Loader2 className="mr-3 animate-spin text-emerald-800" />
            <span className="text-sm text-slate-600">
              Loading delegation records...
            </span>
          </div>
        ) : (
          <>
            {canCreate && (
              <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Create New Delegation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose who will act on your behalf and specify the period.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="delegate"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Delegate Approval To
                    </label>

                    <select
                      id="delegate"
                      value={delegateUserId}
                      onChange={(event) =>
                        setDelegateUserId(event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Select a supervisor or manager</option>
                      {delegates.map((delegate) => (
                        <option key={delegate.id} value={delegate.id}>
                          {delegate.fullName} — {formatRole(delegate.role)}
                          {delegate.designation
                            ? ` (${delegate.designation})`
                            : ''}
                        </option>
                      ))}
                    </select>

                    {delegates.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No eligible active delegate accounts were found.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="endDate"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        min={startDate || undefined}
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reason"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Reason <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <textarea
                      id="reason"
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Enter the reason for delegating approval..."
                      className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    The selected delegate will be authorised to act on your
                    behalf during the specified dates. This delegation does not
                    transfer your entire account permissions.
                  </div>

                  <button
                    type="submit"
                    disabled={saving || delegates.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {saving ? 'Submitting...' : 'Submit Delegation'}
                  </button>
                </form>
              </section>
            )}

            {!canCreate && (
              <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                You can view approval delegations assigned to you here. Only
                authorised managers can create new delegations.
              </div>
            )}

            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Delegations I Created
                  </h2>
                  <p className="text-sm text-slate-500">
                    Approval authority you have delegated to others.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {myDelegations.length}
                </span>
              </div>

              {myDelegations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  You have not created any delegations.
                </div>
              ) : (
                <div className="space-y-4">
                  {myDelegations.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserRound
                              size={19}
                              className="text-emerald-800"
                            />
                            <h3 className="font-bold text-slate-900">
                              {item.delegate?.fullName ||
                                item.delegate?.username ||
                                'Unknown delegate'}
                            </h3>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.delegate?.designation ||
                              formatRole(item.delegate?.role || 'Delegate')}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status === 'active' ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {item.status === 'active' ? 'Active' : 'Cancelled'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Start Date</p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {formatDate(item.startDate)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">End Date</p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {formatDate(item.endDate)}
                          </p>
                        </div>
                      </div>

                      {item.reason && (
                        <p className="mt-3 text-sm text-slate-600">
                          <span className="font-semibold">Reason:</span>{' '}
                          {item.reason}
                        </p>
                      )}

                      {item.status === 'active' && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <button
                            onClick={() => cancelDelegation(item.id)}
                            disabled={cancellingId === item.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {cancellingId === item.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <XCircle size={16} />
                            )}
                            Cancel Delegation
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Delegations Assigned to Me
                  </h2>
                  <p className="text-sm text-slate-500">
                    Approval authority delegated to your account.
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                  {receivedDelegations.length}
                </span>
              </div>

              {receivedDelegations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  No one has delegated approval authority to you.
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedDelegations.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-900">
                            {item.delegator?.fullName ||
                              item.delegator?.username ||
                              'Unknown delegator'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatRole(
                              item.delegatorRole || item.delegator?.role || '',
                            )}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status === 'active' ? 'Active' : 'Cancelled'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={16} />
                          {formatDate(item.startDate)} –{' '}
                          {formatDate(item.endDate)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Clock size={16} />
                          {item.reason || 'No reason provided'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
