
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Wrench,
  ClipboardList,
  Loader2,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';

const reportTypes = [
  { value: 'hazard', label: 'Hazard', description: 'Unsafe condition or potential risk' },
  { value: 'accident', label: 'Accident', description: 'An accident that occurred at work' },
  { value: 'injury', label: 'Injury', description: 'An employee sustained an injury' },
  { value: 'near_miss', label: 'Near Miss', description: 'An incident that almost caused harm' },
  { value: 'equipment_defect', label: 'Equipment Defect', description: 'Faulty or damaged equipment' },
];

const severityOptions = [
  { value: 'low', label: 'Low', description: 'Minor issue with little risk', color: 'border-blue-300 bg-blue-50 text-blue-800' },
  { value: 'medium', label: 'Medium', description: 'Issue requiring attention', color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { value: 'high', label: 'High', description: 'Serious risk requiring prompt action', color: 'border-orange-300 bg-orange-50 text-orange-800' },
  { value: 'critical', label: 'Critical', description: 'Immediate danger requiring urgent action', color: 'border-rose-300 bg-rose-50 text-rose-800' },
];

type Employee = {
  id: number;
  fullName: string;
  employeeNumber: string;
};

export default function NewSafetyReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportDate, setReportDate] = useState('');
  const [reportType, setReportType] = useState('hazard');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [farm, setFarm] = useState('');
  const [section, setSection] = useState('');
  const [location, setLocation] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentCode, setEquipmentCode] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [assignedToEmployeeId, setAssignedToEmployeeId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const today = new Date();
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    setReportDate(localDate);

    const requestedType = searchParams.get('type');

    if (reportTypes.some((item) => item.value === requestedType)) {
      setReportType(requestedType!);
    }

    async function loadEmployees() {
      setLoadingEmployees(true);

      try {
        const response = await fetch('/api/safety-reports/assignees');

        if (!response.ok) return;

        const data = await response.json();

        setEmployees(
          Array.isArray(data.employees) ? data.employees : [],
        );
        setCanAssign(Boolean(data.canAssign));
      } catch (err) {
        console.error('Unable to load employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, [searchParams]);

  const isEquipmentDefect = reportType === 'equipment_defect';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!reportDate || !title.trim() || !description.trim()) {
      setError('Please complete the report date, title and description.');
      return;
    }

    if (isEquipmentDefect && !equipmentName.trim()) {
      setError('Please enter the name of the faulty equipment.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/safety-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate,
          reportType,
          severity,
          title: title.trim(),
          description: description.trim(),
          farm: farm.trim() || null,
          section: section.trim() || null,
          location: location.trim() || null,
          equipmentName: equipmentName.trim() || null,
          equipmentCode: equipmentCode.trim() || null,
          immediateAction: immediateAction.trim() || null,
          assignedToEmployeeId:
            canAssign && assignedToEmployeeId
              ? Number(assignedToEmployeeId)
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to save the safety report.',
        );
      }

      setSuccess(`Report ${data.reportNumber} created successfully.`);

      window.setTimeout(() => {
        router.push(`/safety-reports/${data.reportId}`);
        router.refresh();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving the report.',
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

  const labelClass = 'mb-2 block text-sm font-semibold text-gray-700';

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
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
            <h1 className="font-bold text-gray-900">New Safety Report</h1>
            <p className="text-xs text-gray-500">
              Record a workplace issue or incident
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-700">
            Safety & Defects Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Report a Safety Issue
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Provide accurate information so the issue can be investigated
            and appropriate corrective action taken.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Report Information</h3>
                <p className="text-xs text-gray-500">
                  Basic details about the issue
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Report Date *</label>
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Report Category *</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className={inputClass}
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <p className={labelClass}>Severity Level *</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {severityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSeverity(option.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      severity === option.value
                        ? `${option.color} ring-2 ring-offset-1 ring-current`
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 opacity-80">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Report Title *</label>
              <input
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Briefly describe the safety issue"
                className={inputClass}
              />
            </div>

            <div className="mt-5">
              <label className={labelClass}>Detailed Description *</label>
              <textarea
                required
                rows={5}
                maxLength={10000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, what was observed, who or what was affected, and any other relevant details..."
                className={inputClass}
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {description.length}/10,000 characters
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Location Details</h3>
                <p className="text-xs text-gray-500">
                  Where did the issue occur?
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Farm</label>
                <select
                  value={farm}
                  onChange={(e) => setFarm(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select farm</option>
                  <option value="K1 FARM">K1 FARM</option>
                  <option value="K2 FARM">K2 FARM</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Section</label>
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. First From Walkway, Middle, End To Net"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Exact Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Greenhouse 4, Bed 12, packing area"
                className={inputClass}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Wrench size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Equipment Details</h3>
                <p className="text-xs text-gray-500">
                  Complete this section when equipment is involved
                </p>
              </div>
            </div>

            {isEquipmentDefect && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Equipment name is required for an equipment defect report.
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Equipment Name {isEquipmentDefect ? '*' : ''}
                </label>
                <input
                  required={isEquipmentDefect}
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="e.g. Conveyor belt"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Equipment Code / Number</label>
                <input
                  value={equipmentCode}
                  onChange={(e) => setEquipmentCode(e.target.value)}
                  placeholder="Enter equipment identification number"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <h3 className="font-bold text-gray-900">
                Immediate Action Taken
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Describe any immediate steps taken to control the risk or
                assist affected employees.
              </p>
            </div>

            <textarea
              rows={4}
              maxLength={5000}
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
              placeholder="e.g. Area isolated, equipment switched off, supervisor informed..."
              className={inputClass}
            />
          </section>

          {canAssign && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="font-bold text-gray-900">Assign Report</h3>
              <p className="mt-1 text-xs text-gray-500">
                Assign the report to an employee responsible for follow-up.
              </p>

              <div className="mt-5">
                <label className={labelClass}>Assigned Employee</label>
                <select
                  value={assignedToEmployeeId}
                  onChange={(e) => setAssignedToEmployeeId(e.target.value)}
                  className={inputClass}
                  disabled={loadingEmployees}
                >
                  <option value="">Leave unassigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.employeeNumber})
                    </option>
                  ))}
                </select>

                {loadingEmployees && (
                  <p className="mt-2 text-xs text-gray-500">
                    Loading employees...
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 pb-8 sm:flex-row">
            <Link
              href="/safety-reports"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <X size={17} />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123d2b] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1c5a40] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving Report...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Submit Safety Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
