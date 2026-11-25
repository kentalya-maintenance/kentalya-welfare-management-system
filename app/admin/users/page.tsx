
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Search,
  RefreshCw,
  LockKeyhole,
  UserRound,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';

type Employee = {
  id: number;
  employeeNumber: string;
  fullName: string;
  designation: string | null;
  department: string | null;
  section: string | null;
};

type AppUser = {
  id: number;
  username: string;
  role: string;
  isActive: 'yes' | 'no';
  employeeId: number | null;
  employeeName: string | null;
  employeeNumber: string | null;
  department: string | null;
  designation: string | null;
  createdAt: string | Date;
};

const roles = [
  { value: 'system_admin', label: 'System Administrator' },
  { value: 'director', label: 'Director' },
  { value: 'head_of_department', label: 'Head of Welfare Department' },
  { value: 'supervisor', label: 'Welfare Supervisor' },
  { value: 'welfare_staff', label: 'Welfare Staff / Worker' },
];

function formatRole(role: string) {
  return roles.find((item) => item.value === role)?.label ??
    role.replaceAll('_', ' ');
}

function roleStyle(role: string) {
  switch (role) {
    case 'system_admin':
      return 'bg-violet-100 text-violet-700';
    case 'director':
      return 'bg-blue-100 text-blue-700';
    case 'head_of_department':
      return 'bg-emerald-100 text-emerald-700';
    case 'supervisor':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('welfare_staff');
  const [employeeId, setEmployeeId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, employeesResponse] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store' }),
        fetch('/api/employees', { cache: 'no-store' }),
      ]);

      const usersData = await usersResponse.json();
      const employeesData = await employeesResponse.json();

      if (!usersResponse.ok) {
        throw new Error(
          usersData.message || 'Unable to retrieve application users.',
        );
      }

      if (!employeesResponse.ok) {
        throw new Error(
          employeesData.message || 'Unable to retrieve employees.',
        );
      }

      setUsers(usersData.users ?? []);
      setEmployees(employeesData.employees ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load administration data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          role,
          employeeId: role === 'system_admin' ? null : employeeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account.');
      }

      setMessage('Application account created successfully.');

      setUsername('');
      setPassword('');
      setRole('welfare_staff');
      setEmployeeId('');
      setShowForm(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.',
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const searchValue = search.toLowerCase();

    return (
      user.username.toLowerCase().includes(searchValue) ||
      (user.employeeName ?? '').toLowerCase().includes(searchValue) ||
      (user.employeeNumber ?? '').toLowerCase().includes(searchValue) ||
      formatRole(user.role).toLowerCase().includes(searchValue)
    );
  });

  const activeUsers = users.filter(
    (user) => user.isActive === 'yes',
  ).length;

  const adminCount = users.filter(
    (user) => user.role === 'system_admin',
  ).length;

  const linkedAccounts = users.filter(
    (user) => user.employeeId !== null,
  ).length;

  const requiresEmployee = role !== 'system_admin';

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-100"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-base font-bold text-gray-900">
                Administration
              </h1>
              <p className="text-xs text-gray-500">
                Kentalya Welfare Management System
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Page introduction */}
        <section className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <LockKeyhole size={14} />
            Secure system administration
          </div>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            User Management
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Create and manage application accounts, connect users to
            Welfare employees and assign their system responsibilities.
          </p>
        </section>

        {/* Notifications */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={19} />
            {message}
            <button
              onClick={() => setMessage('')}
              className="ml-auto font-bold"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Total accounts
              </span>
              <Users className="text-blue-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {users.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Registered application users
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Active accounts
              </span>
              <CheckCircle2 className="text-emerald-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {activeUsers}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Currently enabled accounts
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Linked employees
              </span>
              <Building2 className="text-violet-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {linkedAccounts}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Connected to employee records
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Administrators
              </span>
              <ShieldCheck className="text-amber-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {adminCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              System administrator accounts
            </p>
          </div>
        </section>

        {/* Account management heading */}
        <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Application Accounts
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage login accounts and assigned responsibilities.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setError('');
              setMessage('');
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#123d2b] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-[#195239]"
          >
            <UserPlus size={17} />
            Create User Account
          </button>
        </section>

        {/* Create account form */}
        {showForm && (
          <section className="mb-7 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-emerald-50/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    Create Application Account
                  </h3>
                  <p className="text-xs text-gray-500">
                    Register a new Welfare system user.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={createUser} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Username *
                  </label>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    minLength={3}
                    maxLength={50}
                    pattern="[a-zA-Z0-9._-]+"
                    placeholder="e.g. john.smith"
                    autoComplete="off"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Letters, numbers, dots, underscores and hyphens.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Minimum 12 characters"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Use a strong, unique password.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Application Role *
                  </label>
                  <select
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value);
                      setEmployeeId('');
                    }}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  >
                    {roles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Determines what this user can access.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Link Welfare Employee
                    {requiresEmployee ? ' *' : ''}
                  </label>
                  <select
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    required={requiresEmployee}
                    disabled={!requiresEmployee}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">
                      {requiresEmployee
                        ? 'Select an employee'
                        : 'Not required for System Admin'}
                    </option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeNumber} - {employee.fullName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {requiresEmployee
                      ? 'Each employee can have one application account.'
                      : 'System administrators do not need employee records.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || (requiresEmployee && !employeeId)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#123d2b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#195239] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search and user table */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-gray-900">
                Registered Users
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {filteredUsers.length} account(s) displayed
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <div className="text-center">
                <RefreshCw
                  size={26}
                  className="mx-auto animate-spin text-emerald-700"
                />
                <p className="mt-3 text-sm text-gray-500">
                  Loading application accounts...
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Users size={27} />
              </div>
              <h4 className="mt-4 font-bold text-gray-800">
                No application accounts found
              </h4>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                {search
                  ? 'Try a different search term.'
                  : 'Create an account to give a Welfare employee access to the system.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-gray-50">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Account ID</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-gray-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                            {user.username[0]?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {user.username}
                            </p>
                            <p className="text-xs text-gray-400">
                              Application user
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {user.employeeName ? (
                          <>
                            <p className="text-sm font-medium text-gray-800">
                              {user.employeeName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {user.employeeNumber}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs italic text-gray-400">
                            Not linked
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${roleStyle(user.role)}`}
                        >
                          {formatRole(user.role)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            user.isActive === 'yes'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive === 'yes'
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {user.isActive === 'yes' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold tabular-nums text-gray-600">
                          #{user.id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-5 py-3">
            <p className="text-xs text-gray-400">
              Kentalya Welfare · Secure User Management
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <LockKeyhole size={13} />
              Protected access
            </div>
          </div>
        </section>

        {/* Role information */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                Application Roles
              </h3>
              <p className="text-xs text-gray-500">
                Overview of the available access levels.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((item) => (
              <div
                key={item.value}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm">
                  <UserRound size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          Kentalya PLC · Welfare Management System
        </footer>
      </div>
    </main>
  );
}
