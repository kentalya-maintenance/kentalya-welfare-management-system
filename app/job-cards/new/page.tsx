
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  ClipboardList,
  User,
  Clock3,
  Wrench,
  AlertTriangle,
  Languages,
  Loader2,
  Lock,
} from 'lucide-react';

type Employee = {
  id: number;
  employeeNumber: string;
  fullName: string;
  designation: string | null;
  department?: string | null;
  section: string | null;
};

type Language = 'en' | 'sw';

const labels = {
  en: {
    title: 'Daily Work Job Card',
    subtitle: 'Daily employee work and activity report',
    employee: 'Employee Information',
    employeeName: 'Employee Name',
    employeeNumber: 'Employee Number / P.No.',
    designation: 'Designation',
    department: 'Department',
    date: 'Work Date',
    section: 'Section / Work Area',
    selectSection: 'Select work area',
    specificArea: 'Specific Area Working',
    specificAreaPlaceholder: 'Enter the exact area where you worked...',
    specificAreaHint: 'Specify the exact location, building, room, or work point.',
    morning: 'Morning Work Details',
    morningTime: '7:00 AM – 12:00 PM',
    morningPlaceholder: 'Describe the work you performed between 7:00 AM and 12:00 PM...',
    evening: 'Evening Work Details',
    eveningTime: '1:00 PM – 4:00 PM',
    eveningPlaceholder: 'Describe the work you performed between 1:00 PM and 4:00 PM...',
    equipment: 'Tools and Equipment Used',
    equipmentPlaceholder: 'List the tools and equipment you used, one item per line.',
    equipmentHint: 'Example: Lawn mower, slashers, spanners, wheelbarrow',
    defects: 'Defects / Problems Encountered',
    defectsPlaceholder: 'Record any defects, breakdowns or challenges encountered...',
    safety: 'Safety Reminder',
    safetyText: 'Use equipment safely. Wear appropriate protective equipment and report defects immediately.',
    cancel: 'Cancel',
    submit: 'Submit Daily Report',
    submitting: 'Submitting...',
    required: 'Please enter the work date and morning work details.',
    loading: 'Loading your employee information...',
    loadError: 'Unable to load your employee information.',
    success: 'Your daily work report has been submitted.',
    approvalNote: 'After submission, your report will be sent to your supervisor for review and then to the Head of Department for approval.',
    locked: 'Loaded from your employee account',
  },
  sw: {
    title: 'Kadi ya Kazi ya Kila Siku',
    subtitle: 'Ripoti ya kazi na shughuli za mfanyakazi za kila siku',
    employee: 'Taarifa za Mfanyakazi',
    employeeName: 'Jina la Mfanyakazi',
    employeeNumber: 'Nambari ya Mfanyakazi / P.No.',
    designation: 'Cheo cha Kazi',
    department: 'Idara',
    date: 'Tarehe ya Kazi',
    section: 'Sehemu ya Kazi',
    selectSection: 'Chagua sehemu ya kazi',
    specificArea: 'Eneo Mahususi la Kazi',
    specificAreaPlaceholder: 'Andika eneo halisi ulilofanyia kazi...',
    specificAreaHint: 'Taja eneo, jengo, chumba au sehemu halisi ya kazi.',
    morning: 'Maelezo ya Kazi ya Asubuhi',
    morningTime: 'Saa 7:00 Asubuhi – Saa 12:00 Jioni',
    morningPlaceholder: 'Eleza kazi ulizofanya kati ya saa 7:00 asubuhi na saa 12:00 jioni...',
    evening: 'Maelezo ya Kazi ya Alasiri',
    eveningTime: 'Saa 1:00 – 4:00 Alasiri',
    eveningPlaceholder: 'Eleza kazi ulizofanya kati ya saa 1:00 na saa 4:00 alasiri...',
    equipment: 'Vifaa na Zana Ulizotumia',
    equipmentPlaceholder: 'Orodhesha vifaa na zana ulizotumia, kila kifaa kwenye mstari wake.',
    equipmentHint: 'Mfano: Mashine ya kukata nyasi, mapanga, spana, toroli',
    defects: 'Hitilafu / Changamoto Zilizojitokeza',
    defectsPlaceholder: 'Andika hitilafu, kuharibika kwa vifaa au changamoto zozote...',
    safety: 'Tahadhari ya Usalama',
    safetyText: 'Tumia vifaa kwa usalama. Vaa vifaa vya kujikinga na ripoti hitilafu mara moja.',
    cancel: 'Ghairi',
    submit: 'Wasilisha Ripoti ya Kila Siku',
    submitting: 'Inawasilisha...',
    required: 'Tafadhali weka tarehe na maelezo ya kazi ya asubuhi.',
    loading: 'Inapakia taarifa zako za mfanyakazi...',
    loadError: 'Imeshindwa kupakia taarifa zako za mfanyakazi.',
    success: 'Ripoti yako ya kazi imewasilishwa.',
    approvalNote: 'Baada ya kuwasilisha, ripoti itatumwa kwa msimamizi wako kukaguliwa na kisha kwa Mkuu wa Idara kwa idhini.',
    locked: 'Taarifa zimechukuliwa kutoka kwenye akaunti yako',
  },
};

export default function NewJobCardPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>('en');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState('');

  const [jobDate, setJobDate] = useState('');
  const [section, setSection] = useState('');
  const [specificArea, setSpecificArea] = useState('');
  const [morningWork, setMorningWork] = useState('');
  const [eveningWork, setEveningWork] = useState('');
  const [toolsUsed, setToolsUsed] = useState('');
  const [defectsEncountered, setDefectsEncountered] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = labels[language];

  useEffect(() => {
    const today = new Date();

    setJobDate([
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-'));

    async function loadMyEmployee() {
      try {
        setEmployeeLoading(true);
        setEmployeeError('');

        const response = await fetch('/api/me/employee', {
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || labels.en.loadError);
        }

        setEmployee(data.employee);
        setSection(data.employee.section || '');
      } catch (err) {
        setEmployeeError(
          err instanceof Error ? err.message : labels.en.loadError,
        );
      } finally {
        setEmployeeLoading(false);
      }
    }

    loadMyEmployee();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!employee || !jobDate || !morningWork.trim()) {
      setError(t.required);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        jobDate,
        section: section || null,
        specificArea: specificArea.trim() || null,

        // Morning work is saved in the existing jobDescription field.
        jobDescription: morningWork.trim(),

        // Evening work is saved in the existing afterLunchWork field.
        afterLunchWork: eveningWork.trim() || null,

        toolsUsed: toolsUsed.trim(),
        defectsEncountered: defectsEncountered.trim() || null,
        language,
      };

      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit daily report.');
      }

      setSuccess(`${t.success} ${data.jobCardNumber || ''}`);

      window.setTimeout(() => {
        router.push('/job-cards');
        router.refresh();
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit daily report.',
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

  const readOnlyClass =
    'mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 outline-none';

  const labelClass = 'text-sm font-semibold text-slate-700';

  function ReadOnlyField({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <div className="relative">
          <input
            type="text"
            readOnly
            disabled
            value={value}
            className={`${readOnlyClass} pr-11`}
            placeholder={employeeLoading ? t.loading : 'Not available'}
          />
          <Lock
            size={15}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">{t.locked}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/job-cards"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <h1 className="font-bold text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setLanguage((current) => current === 'en' ? 'sw' : 'en')
            }
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Languages size={17} />
            {language === 'en' ? 'Kiswahili' : 'English'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-700 p-7 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <ClipboardList size={27} />
            </div>
            <div>
              <p className="text-sm text-emerald-100">Welfare Department</p>
              <h2 className="text-2xl font-bold">{t.title}</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50">
            {t.subtitle}
          </p>
        </section>

        {employeeLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <Loader2 size={20} className="animate-spin" />
            {t.loading}
          </div>
        )}

        {employeeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {employeeError}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <User className="text-emerald-700" size={21} />
              <div>
                <h3 className="font-bold text-slate-900">{t.employee}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Employee identity details cannot be changed.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ReadOnlyField
                  label={t.employeeName}
                  value={employee?.fullName || ''}
                />
              </div>

              <ReadOnlyField
                label={t.employeeNumber}
                value={employee?.employeeNumber || ''}
              />

              <ReadOnlyField
                label={t.designation}
                value={employee?.designation || ''}
              />

              <ReadOnlyField
                label={t.department}
                value={employee?.department || 'Welfare'}
              />

              <div>
                <label className={labelClass}>{t.date} *</label>
                <input
                  required
                  type="date"
                  value={jobDate}
                  onChange={(event) => setJobDate(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>{t.section}</label>
                <select
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  className={inputClass}
                >
                  <option value="">{t.selectSection}</option>
                  <option value="K1 FARM">K1 FARM</option>
                  <option value="K2 FARM">K2 FARM</option>
                  <option value="Top Camp">Top Camp</option>
                </select>
                <p className="mt-1 text-xs text-emerald-700">
                  You may change the work area for this daily report.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>{t.specificArea}</label>
                <input
                  type="text"
                  value={specificArea}
                  onChange={(event) => setSpecificArea(event.target.value)}
                  className={inputClass}
                  placeholder={t.specificAreaPlaceholder}
                  maxLength={255}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t.specificAreaHint}
                </p>
              </div>
            </div>
          </section>

          {/* MORNING WORK */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <Clock3 className="text-emerald-700" size={21} />
              <div>
                <h3 className="font-bold text-slate-900">{t.morning}</h3>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {t.morningTime}
                </p>
              </div>
            </div>

            <label className={labelClass}>{t.morning} *</label>
            <textarea
              required
              rows={6}
              value={morningWork}
              onChange={(event) => setMorningWork(event.target.value)}
              className={inputClass}
              placeholder={t.morningPlaceholder}
            />
          </section>

          {/* EVENING WORK */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <Clock3 className="text-emerald-700" size={21} />
              <div>
                <h3 className="font-bold text-slate-900">{t.evening}</h3>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {t.eveningTime}
                </p>
              </div>
            </div>

            <label className={labelClass}>{t.evening}</label>
            <textarea
              rows={6}
              value={eveningWork}
              onChange={(event) => setEveningWork(event.target.value)}
              className={inputClass}
              placeholder={t.eveningPlaceholder}
            />
          </section>

          {/* TOOLS AND EQUIPMENT */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <Wrench className="text-emerald-700" size={21} />
              <div>
                <h3 className="font-bold text-slate-900">{t.equipment}</h3>
                <p className="text-xs text-slate-500">{t.equipmentHint}</p>
              </div>
            </div>

            <textarea
              rows={4}
              value={toolsUsed}
              onChange={(event) => setToolsUsed(event.target.value)}
              className={inputClass}
              placeholder={t.equipmentPlaceholder}
            />
          </section>

          {/* DEFECTS AND PROBLEMS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <AlertTriangle className="text-amber-600" size={21} />
              <h3 className="font-bold text-slate-900">{t.defects}</h3>
            </div>

            <textarea
              rows={4}
              value={defectsEncountered}
              onChange={(event) => setDefectsEncountered(event.target.value)}
              className={inputClass}
              placeholder={t.defectsPlaceholder}
            />
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
            <div className="mb-3 flex items-center gap-2 text-amber-900">
              <AlertTriangle size={20} />
              <h3 className="font-bold">{t.safety}</h3>
            </div>
            <p className="text-sm leading-6 text-amber-900">
              {t.safetyText}
            </p>
          </section>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {t.approvalNote}
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              href="/job-cards"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.cancel}
            </Link>

            <button
              type="submit"
              disabled={saving || employeeLoading || !employee}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {saving ? t.submitting : t.submit}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
