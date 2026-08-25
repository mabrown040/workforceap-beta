'use client';

import Link from 'next/link';

export type ApplicationsDatasheetRow = {
  id: string;
  memberId: string;
  submittedAt: string;
  status: string;
  fullName: string;
  email: string;
  phone: string;
  programInterest: string;
  programRanked: string;
  referralSource: string;
  ageGroup: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  currentlyUnemployed: string;
  receivingUnemployment: string;
  unemploymentRanOut: string;
  laidOffCompany: string;
  onSnapWic: string;
  incomeBelow60k: string;
  barriers: string;
  hearAboutUs: string;
  partnerReferral: string;
  qualifies: string;
  yesCount: number | null;
  highlighted: boolean;
};

export default function ApplicationsDatasheetClient({
  rows,
}: {
  rows: ApplicationsDatasheetRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[var(--wa-muted)] text-sm py-6">
        No applications yet. New apply submissions will appear here with questionnaire answers.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--wa-border)] bg-[var(--wa-surface)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--wa-border)] text-left text-[var(--wa-muted)]">
            <th className="px-3 py-2 font-medium">Submitted</th>
            <th className="px-3 py-2 font-medium">Applicant</th>
            <th className="px-3 py-2 font-medium">Program</th>
            <th className="px-3 py-2 font-medium">Eligibility signals</th>
            <th className="px-3 py-2 font-medium">Referral</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Member</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              id={`app-${row.id}`}
              className={`border-b border-[var(--wa-border)] align-top ${
                row.highlighted ? 'bg-[color-mix(in_srgb,var(--wa-accent)_12%,transparent)]' : ''
              }`}
            >
              <td className="px-3 py-3 whitespace-nowrap">
                {new Date(row.submittedAt).toLocaleString()}
              </td>
              <td className="px-3 py-3">
                <div className="font-medium text-[var(--wa-fg)]">{row.fullName}</div>
                <div className="text-[var(--wa-muted)]">{row.email}</div>
                <div className="text-[var(--wa-muted)]">{row.phone}</div>
                <div className="text-[var(--wa-muted)] mt-1">
                  {row.city}, {row.state} {row.zip} · {row.county} · {row.ageGroup}
                </div>
              </td>
              <td className="px-3 py-3 max-w-[16rem]">
                <div>{row.programInterest}</div>
                {row.programRanked ? (
                  <div className="text-[var(--wa-muted)] text-xs mt-1">{row.programRanked}</div>
                ) : null}
              </td>
              <td className="px-3 py-3 max-w-[18rem]">
                <div>Unemployed: {row.currentlyUnemployed}</div>
                <div>Receiving UI: {row.receivingUnemployment}</div>
                <div>UI ran out: {row.unemploymentRanOut}</div>
                <div>Laid off from: {row.laidOffCompany}</div>
                <div>SNAP/WIC: {row.onSnapWic}</div>
                <div>Income &lt;$60k: {row.incomeBelow60k}</div>
                <div className="mt-1">Barriers: {row.barriers}</div>
                <div className="mt-1 text-[var(--wa-muted)]">
                  Soft fit: {row.qualifies}
                  {row.yesCount != null ? ` (${row.yesCount})` : ''}
                </div>
              </td>
              <td className="px-3 py-3 max-w-[14rem]">
                <div>{row.hearAboutUs}</div>
                <div className="mt-1">Partner: {row.partnerReferral}</div>
                <div className="text-[var(--wa-muted)] text-xs mt-1">{row.referralSource}</div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{row.status}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <Link
                  className="text-[var(--wa-accent)] underline-offset-2 hover:underline"
                  href={`/admin/members/${row.memberId}`}
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
