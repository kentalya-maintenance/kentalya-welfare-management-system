
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  ClipboardList,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

import { db } from '@/db';
import { welfareJobCards, jobCardEquipment } from '@/db/schema';

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return 'Not recorded';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return 'Not recorded';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return date.toLocaleString('en-GB');
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-900">
        {value === null || value === undefined || value === ''
          ? 'Not recorded'
          : String(value)}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="rounded-lg bg-green-50 p-2 text-green-800">
          {icon}
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function JobCardDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const jobCardId = Number(id);

  if (!Number.isInteger(jobCardId) || jobCardId <= 0) {
    notFound();
  }

  const [jobCard] = await db
    .select()
    .from(welfareJobCards)
    .where(eq(welfareJobCards.id, jobCardId))
    .limit(1);

  if (!jobCard) {
    notFound();
  }

  const equipment = await db
    .select()
    .from(jobCardEquipment)
    .where(eq(jobCardEquipment.jobCardId, jobCardId));

  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/job-cards"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            <ArrowLeft size={17} />
            Back to Job Cards
          </Link>

          <span
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              statusStyles[jobCard.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {jobCard.status.replace('_', ' ')}
          </span>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-[#123d2b] to-[#246344] p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-medium text-green-100">
            WELFARE JOB CARD
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {jobCard.jobCardNumber}
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-green-50">
            <span className="flex items-center gap-2">
              <CalendarDays size={17} />
              {formatDate(jobCard.jobDate)}
            </span>
            <span className="flex items-center gap-2">
              <User size={17} />
              {jobCard.employeeName}
            </span>
          </div>
        </div>

        <Section title="Employee Information" icon={<User size={20} />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Employee Name" value={jobCard.employeeName} />
            <Detail label="Employee Number" value={jobCard.employeeNumber} />
            <Detail label="Designation" value={jobCard.designation} />
            <Detail label="Section" value={jobCard.section} />
            <Detail label="Job Date" value={formatDate(jobCard.jobDate)} />
            <Detail label="Job Card Number" value={jobCard.jobCardNumber} />
          </div>
        </Section>

        <Section title="Work Details" icon={<ClipboardList size={20} />}>
          <div className="space-y-4">
            <Detail
              label="Job Description"
              value={jobCard.jobDescription}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Starting Time" value={jobCard.startTime} />
              <Detail label="Finishing Time" value={jobCard.endTime} />
            </div>

            <Detail
              label="Lunch Information"
              value={jobCard.lunchInformation}
            />

            <Detail
              label="After Lunch Work"
              value={jobCard.afterLunchWork}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="After Lunch Starting Time"
                value={jobCard.afterLunchStartTime}
              />
              <Detail
                label="After Lunch Finishing Time"
                value={jobCard.afterLunchEndTime}
              />
            </div>

            <Detail
              label="Employee Job Status"
              value={jobCard.employeeJobStatus}
            />
          </div>
        </Section>

        <Section title="Equipment Issued" icon={<Wrench size={20} />}>
          {equipment.length === 0 ? (
            <p className="text-sm text-gray-500">
              No equipment has been recorded for this job card.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">Equipment</th>
                    <th className="px-3 py-3">Quantity</th>
                    <th className="px-3 py-3">Condition on Issue</th>
                    <th className="px-3 py-3">Condition on Return</th>
                    <th className="px-3 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-3 py-4 font-semibold text-gray-900">
                        {item.equipmentName}
                      </td>
                      <td className="px-3 py-4">{item.quantity}</td>
                      <td className="px-3 py-4">
                        {item.conditionOnIssue || '—'}
                      </td>
                      <td className="px-3 py-4">
                        {item.conditionOnReturn || '—'}
                      </td>
                      <td className="px-3 py-4">
                        {item.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Defects Encountered" icon={<AlertTriangle size={20} />}>
          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {jobCard.defectsEncountered || 'No defects recorded.'}
          </p>
        </Section>

        <Section title="Signatures and Approval" icon={<CheckCircle2 size={20} />}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">Employee</h3>
              <p className="mt-2 text-sm text-gray-600">
                {jobCard.employeeName}
              </p>
              {jobCard.employeeSignature ? (
                <img
                  src={jobCard.employeeSignature}
                  alt="Employee signature"
                  className="mt-4 max-h-32 max-w-full object-contain"
                />
              ) : (
                <p className="mt-4 text-sm italic text-gray-400">
                  No employee signature recorded.
                </p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Signed: {formatDateTime(jobCard.employeeSignedAt)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">Supervisor</h3>
              <p className="mt-2 text-sm text-gray-600">
                {jobCard.supervisorName || 'Not recorded'}
              </p>
              {jobCard.supervisorSignature ? (
                <img
                  src={jobCard.supervisorSignature}
                  alt="Supervisor signature"
                  className="mt-4 max-h-32 max-w-full object-contain"
                />
              ) : (
                <p className="mt-4 text-sm italic text-gray-400">
                  No supervisor signature recorded.
                </p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Signed: {formatDateTime(jobCard.supervisorSignedAt)}
              </p>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <FileText size={15} />
            Created: {formatDateTime(jobCard.createdAt)}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={15} />
            Last updated: {formatDateTime(jobCard.updatedAt)}
          </span>
        </div>
      </div>
    </main>
  );
}
