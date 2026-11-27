
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  UserRound,
  RefreshCw,
  X,
  Save,
  Mail,
  Phone,
  BriefcaseBusiness,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Pencil,
  UserX,
  UserCheck,
} from 'lucide-react';

type Employee = {
  id: number;
  employeeNumber: string;
  fullName: string;
  designation: string;
  department: string | null;
  section: string | null;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
};

type EmployeeForm = {
  employeeNumber: string;
  fullName: string;
  designation: string;
  department: string;
  section: string;
  email: string;
  phone: string;
};

const emptyForm: EmployeeForm = {
  employeeNumber: '',
  fullName: '',
  designation: '',
  department: 'Welfare',
  section: '',
  email: '',
  phone: '',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  const [canEdit, setCanEdit] = useState(false);
  const [canManageStatus, setCanManageStatus] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/employees', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load employees.');
      }

      setEmployees(data.employees || []);
      setCanEdit(data.canEdit === true);
      setCanManageStatus(data.canManageStatus === true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load employees.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return employees;

    return employees.filter((employee) =>
      [
        employee.employeeNumber,
        employee.fullName,
        employee.designation,
        employee.department,
        employee.section,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [employees, search]);

  function updateField(field: keyof EmployeeForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setError('');
    setShowForm(true);
  }

  function openEditForm(employee: Employee) {
    setEditingId(employee.id);

    setForm({
      employeeNumber: employee.employeeNumber || '',
      fullName: employee.fullName || '',
      designation: employee.designation || '',
      department: employee.department || 'Welfare',
      section: employee.section || '',
      email: employee.email || '',
      phone: employee.phone || '',
    });

    setMessage('');
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const isEditing = editingId !== null;

      const response = await fetch('/api/employees', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { id: editingId, ...form }
            : form,
        ),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (isEditing
              ? 'Could not update employee.'
              : 'Could not register employee.'),
        );
      }

      setMessage(
        data.message ||
          (isEditing
            ? 'Employee updated successfully.'
            : 'Employee registered successfully.'),
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save employee.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeEmployeeStatus(employee: Employee) {
    if (!canManageStatus || changingStatusId !== null) return;

    const newStatus =
      employee.status === 'active' ? 'inactive' : 'active';

    const actionLabel =
      newStatus === 'inactive' ? 'deactivate' : 'reactivate';

    const confirmed = window.confirm(
      newStatus === 'inactive'
        ? `Are you sure you want to deactivate ${employee.fullName} (${employee.employeeNumber})?\n\nExisting job cards and historical records will be preserved.`
        : `Are you sure you want to reactivate ${employee.fullName} (${employee.employeeNumber})?`,
    );

    if (!confirmed) return;

    setChangingStatusId(employee.id);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          action: 'status',
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Could not ${actionLabel} employee.`,
        );
      }

      setMessage(data.message || `Employee ${actionLabel}d successfully.`);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not ${actionLabel} employee.`,
      );
    } finally {
      setChangingStatusId(null);
    }
  }

  const activeCount = employees.filter(
    (employee) => employee.status === 'active',
  ).length;

  const inactiveCount = employees.length - activeCount;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
              <Users size={17} />
              Staff Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Employee Directory
            </h1>

            <p className="mt-2 text-slate-500">
              Register and manage employees for Welfare Job Cards.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={openNewForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
            >
              <Plus size={19} />
              Add Employee
            </button>
          )}
        </div>

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={19} />
            {message}
            <button
              onClick={() => setMessage('')}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Total Employees
              </span>
              <Users className="text-emerald-700" size={21} />
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {employees.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Active Employees
              </span>
              <CheckCircle2 className="text-emerald-700" size={21} />
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Inactive Employees
              </span>
              <UserRound className="text-slate-400" size={21} />
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {inactiveCount}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Registered Employees
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Employee records available for job card assignment.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <button
                onClick={() => void loadEmployees()}
                disabled={loading}
                className="rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                title="Refresh employees"
              >
                <RefreshCw
                  size={18}
                  className={loading ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Users size={30} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {search
                  ? 'No matching employees'
                  : 'No employees registered yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {search
                  ? 'Try another name, P/No., designation or department.'
                  : 'Start by registering your first employee. Their details will be available when creating Welfare Job Cards.'}
              </p>
              {!search && canEdit && (
                <button
                  onClick={openNewForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Plus size={18} />
                  Register First Employee
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">P/No.</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Section</th>
                    <th className="px-6 py-4">Status</th>
                    {(canEdit || canManageStatus) && (
                      <th className="px-6 py-4 text-center">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-800">
                            {employee.fullName
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {employee.fullName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Employee ID: {employee.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {employee.employeeNumber}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {employee.designation}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {employee.department || '—'}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {employee.section || '—'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            employee.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {employee.status === 'active'
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>

                      {(canEdit || canManageStatus) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditForm(employee)}
                                title={`Edit ${employee.fullName}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                            )}

                            {canManageStatus && (
                              <button
                                type="button"
                                onClick={() =>
                                  void changeEmployeeStatus(employee)
                                }
                                disabled={changingStatusId !== null}
                                title={
                                  employee.status === 'active'
                                    ? 'Deactivate employee'
                                    : 'Reactivate employee'
                                }
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  employee.status === 'active'
                                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {changingStatusId === employee.id ? (
                                  <RefreshCw
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : employee.status === 'active' ? (
                                  <UserX size={15} />
                                ) : (
                                  <UserCheck size={15} />
                                )}

                                {changingStatusId === employee.id
                                  ? 'Please wait...'
                                  : employee.status === 'active'
                                    ? 'Deactivate'
                                    : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingId !== null ? 'Edit Employee' : 'Register Employee'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the employee&apos;s official details.
                </p>
              </div>

              <button
                onClick={closeForm}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-200"
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveEmployee} className="space-y-5 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    P/No. *
                  </label>
                  <input
                    required
                    maxLength={50}
                    value={form.employeeNumber}
                    onChange={(event) =>
                      updateField('employeeNumber', event.target.value)
                    }
                    placeholder="e.g. KG0936"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    required
                    maxLength={255}
                    value={form.fullName}
                    onChange={(event) =>
                      updateField('fullName', event.target.value)
                    }
                    placeholder="Employee full name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Designation *
                  </label>
                  <div className="relative">
                    <BriefcaseBusiness
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      required
                      maxLength={255}
                      value={form.designation}
                      onChange={(event) =>
                        updateField('designation', event.target.value)
                      }
                      placeholder="e.g. Welfare Officer"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Department
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      value={form.department}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Section
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      maxLength={255}
                      value={form.section}
                      onChange={(event) =>
                        updateField('section', event.target.value)
                      }
                      placeholder="Work section"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      maxLength={50}
                      value={form.phone}
                      onChange={(event) =>
                        updateField('phone', event.target.value)
                      }
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      type="email"
                      maxLength={255}
                      value={form.email}
                      onChange={(event) =>
                        updateField('email', event.target.value)
                      }
                      placeholder="employee@company.com"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Update Employee'
                      : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
