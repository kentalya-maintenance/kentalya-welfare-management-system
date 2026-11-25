
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  X,
  ListChecks,
} from 'lucide-react';

type Employee = {
  id: number;
  fullName: string;
  employeeNumber: string;
  designation?: string | null;
  section?: string | null;
  department?: string | null;
  status: string;
};

type Assignment = {
  id: number;
  employeeId: number;
  status: string;
  employeeRemarks?: string | null;
  employee: {
    id: number;
    fullName: string;
    employeeNumber: string;
    designation?: string | null;
    section?: string | null;
  };
};

type WorkSchedule = {
  id: number;
  scheduleNumber: string;
  scheduleDate: string;
  taskTitle: string;
  taskDescription: string;
  section?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  instructions?: string | null;
  status: string;
  assignments: Assignment[];
};

type Props = {
  username: string;
  role: string;
  canCreateSchedules: boolean;
};

const statusStyles: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  not_completed: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateValue(value: string) {
  if (!value) return '';

  return value.slice(0, 10);
}

function formatDate(value: string) {
  const dateValue = getDateValue(value);

  if (!dateValue) return 'Date not available';

  const [year, month, day] = dateValue.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ');
}

export default function WorkSchedulesClient({
  username,
  role,
  canCreateSchedules,
}: Props) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [scheduleDate, setScheduleDate] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [section, setSection] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  useEffect(() => {
    const today = getToday();
    setScheduleDate(today);
    setSelectedDate(today);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const scheduleResponse = await fetch('/api/work-schedules', {
        cache: 'no-store',
      });

      const scheduleData = await scheduleResponse.json();

      if (!scheduleResponse.ok || !scheduleData.success) {
        throw new Error(
          scheduleData.message || 'Unable to load work schedules.',
        );
      }

      setSchedules(scheduleData.schedules || []);

      if (canCreateSchedules) {
        const employeeResponse = await fetch('/api/employees', {
          cache: 'no-store',
        });

        const employeeData = await employeeResponse.json();

        if (!employeeResponse.ok || !employeeData.success) {
          throw new Error(
            employeeData.message || 'Unable to load employees.',
          );
        }

        setEmployees(
          (employeeData.employees || []).filter(
            (employee: Employee) =>
              employee.status === 'active' &&
              employee.department === 'Welfare',
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }, [canCreateSchedules]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter(
      (employee) =>
        employee.fullName.toLowerCase().includes(query) ||
        employee.employeeNumber.toLowerCase().includes(query) ||
        (employee.section || '').toLowerCase().includes(query),
    );
  }, [employees, employeeSearch]);

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schedules.filter((schedule) => {
      const matchesDate =
        !selectedDate ||
        getDateValue(schedule.scheduleDate) === selectedDate;

      const matchesSearch =
        !query ||
        schedule.taskTitle.toLowerCase().includes(query) ||
        schedule.scheduleNumber.toLowerCase().includes(query) ||
        (schedule.section || '').toLowerCase().includes(query) ||
        schedule.assignments.some((assignment) =>
          assignment.employee.fullName.toLowerCase().includes(query),
        );

      return matchesDate && matchesSearch;
    });
  }, [schedules, selectedDate, search]);

  const totalAssignments = schedules.reduce(
    (total, schedule) => total + schedule.assignments.length,
    0,
  );

  const completedAssignments = schedules.reduce(
    (total, schedule) =>
      total +
      schedule.assignments.filter(
        (assignment) => assignment.status === 'completed',
      ).length,
    0,
  );

  function toggleEmployee(employeeId: number) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function resetForm() {
    setScheduleDate(selectedDate || getToday());
    setTaskTitle('');
    setTaskDescription('');
    setSection('');
    setLocation('');
    setStartTime('');
    setEndTime('');
    setInstructions('');
    setEmployeeSearch('');
    setSelectedEmployeeIds([]);
  }

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (selectedEmployeeIds.length === 0) {
      setError('Please select at least one employee.');
      return;
    }

    if (startTime && endTime && endTime <= startTime) {
      setError('The end time must be later than the start time.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/work-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleDate,
          taskTitle,
          taskDescription,
          section,
          location,
          startTime,
          endTime,
          instructions,
          employeeIds: selectedEmployeeIds,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create work schedule.');
      }

      setSuccess(
        `Schedule ${data.scheduleNumber} was created successfully.`,
      );

      setSelectedDate(scheduleDate);
      setShowForm(false);
      resetForm();

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create schedule.',
      );
    } finally {
      setSaving(false);
    }
  }

  const formattedRole = role.replaceAll('_', ' ');

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#123d2b] to-[#1c5a40] text-white shadow-md">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-sm font-bold text-gray-900 sm:text-base">
                Work Scheduling
              </h1>
              <p className="text-[11px] text-gray-500">
                Kentalya Welfare Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-gray-900">
                {username}
              </p>
              <p className="text-[10px] capitalize text-gray-500">
                {formattedRole}
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
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3021] via-[#123d2b] to-[#0b2618] p-7 text-white shadow-xl sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-100">
                <ListChecks size={13} />
                Daily operations
              </span>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Work Schedules & Assignments
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">
                Organise daily activities, allocate work to employees and
                monitor assignment progress across the Welfare Department.
              </p>
            </div>

            {canCreateSchedules && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#123d2b] shadow-lg transition hover:bg-emerald-50"
              >
                <Plus size={18} />
                Create New Schedule
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total schedules
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {schedules.length}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Employee assignments
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {totalAssignments}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Users size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Completed assignments
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {completedAssignments}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={21} />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Schedule Register
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              View tasks and the employees assigned to each task.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </section>

        <section className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Filter by date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Search schedules
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search task, employee or section..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
            <p className="text-sm text-gray-500">
              Loading work schedules...
            </p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardList size={26} />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">
              No schedules found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              There are no work schedules matching the selected date or
              search. Create a new schedule or change your filters.
            </p>
            {canCreateSchedules && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#123d2b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c5a40]"
              >
                <Plus size={16} />
                Create Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <article
                key={schedule.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        {schedule.scheduleNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                          statusStyles[schedule.status] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatStatus(schedule.status)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-gray-900">
                      {schedule.taskTitle}
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {schedule.taskDescription}
                    </p>
                  </div>

                  <div className="shrink-0 space-y-2 text-xs text-gray-500 sm:text-right">
                    <p className="flex items-center gap-2 sm:justify-end">
                      <CalendarDays size={14} />
                      {formatDate(schedule.scheduleDate)}
                    </p>

                    {(schedule.startTime || schedule.endTime) && (
                      <p className="flex items-center gap-2 sm:justify-end">
                        <Clock3 size={14} />
                        {schedule.startTime || '--:--'} –{' '}
                        {schedule.endTime || '--:--'}
                      </p>
                    )}

                    {schedule.location && (
                      <p className="flex items-center gap-2 sm:justify-end">
                        <MapPin size={14} />
                        {schedule.location}
                      </p>
                    )}

                    {schedule.section && (
                      <p className="font-semibold text-gray-600">
                        Section: {schedule.section}
                      </p>
                    )}
                  </div>
                </div>

                {schedule.instructions && (
                  <div className="border-b border-gray-100 bg-amber-50/50 px-5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Instructions
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                      {schedule.instructions}
                    </p>
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                      <Users size={15} />
                      Assigned employees
                    </h4>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                      {schedule.assignments.length} assigned
                    </span>
                  </div>

                  {schedule.assignments.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No employee assignments are available.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {schedule.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {assignment.employee.fullName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {assignment.employee.employeeNumber}
                            </p>
                            {assignment.employee.designation && (
                              <p className="mt-1 truncate text-[11px] text-gray-500">
                                {assignment.employee.designation}
                              </p>
                            )}
                            {assignment.employeeRemarks && (
                              <p className="mt-2 text-xs italic text-gray-600">
                                “{assignment.employeeRemarks}”
                              </p>
                            )}
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold capitalize ${
                              statusStyles[assignment.status] ||
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {formatStatus(assignment.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          Kentalya PLC · Welfare Management System
        </footer>
      </div>

      {showForm && canCreateSchedules && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto my-4 max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#123d2b] px-5 py-4 text-white sm:px-7">
              <div>
                <h2 className="text-lg font-bold">
                  Create Work Schedule
                </h2>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Enter task details and select the employees responsible.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createSchedule} className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Schedule date *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Section
                  </label>
                  <input
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                    placeholder="e.g. K1 Farm, K2 Farm"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Task title *
                </label>
                <input
                  required
                  maxLength={255}
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Enter the work task title"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Task description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={taskDescription}
                  onChange={(event) =>
                    setTaskDescription(event.target.value)
                  }
                  placeholder="Describe the work to be performed..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Work location
                </label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Enter work location"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    End time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Special instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Additional instructions for assigned employees..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Assign employees *
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Select one or more active Welfare employees.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                    {selectedEmployeeIds.length} selected
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="search"
                    value={employeeSearch}
                    onChange={(event) =>
                      setEmployeeSearch(event.target.value)
                    }
                    placeholder="Search employees by name or P/No..."
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="p-4 text-center text-sm text-gray-500">
                      No active employees found.
                    </p>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <label
                        key={employee.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-emerald-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-emerald-700"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {employee.fullName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            {employee.employeeNumber}
                            {employee.designation
                              ? ` · ${employee.designation}`
                              : ''}
                          </p>
                        </div>

                        {employee.section && (
                          <span className="hidden rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-600 sm:inline">
                            {employee.section}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>

                {selectedEmployeeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeIds([])}
                    className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Clear employee selection
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || employees.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123d2b] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c5a40] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
