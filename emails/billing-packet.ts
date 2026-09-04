/**
 * J5 invoice + J6 cover letter delivery emails. Two bodies: one for the
 * participant (plain, reassuring: no cost to you) and one for their assigned
 * counselor (operational: amounts, invoice number, link to the student).
 */
import { escapeHtml } from '@/lib/email/escapeHtml';

export type BillingPacketEmailFacts = {
  memberName: string;
  programTitle: string;
  packetNumber: string;
  totalLabel: string;
  billToName: string;
  invoiceDateLabel: string;
  signerName: string;
  signerTitle: string;
  classLines: string[];
};

function factsTable(f: BillingPacketEmailFacts): string {
  const rows: Array<[string, string]> = [
    ['Invoice number', f.packetNumber],
    ['Invoice date', f.invoiceDateLabel],
    ['Program', f.programTitle],
    ['Billed to', f.billToName],
    ['Total', f.totalLabel],
    ['Signed by', `${f.signerName}, ${f.signerTitle}`],
  ];
  return `
    <table role="presentation" style="border-collapse: collapse; margin: 0 0 1rem; font-size: 14px;">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding: 4px 12px 4px 0; color: #737373; white-space: nowrap;">${escapeHtml(k)}</td><td style="padding: 4px 0; color: #1a1a1a; font-weight: 600;">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}
    </table>`;
}

function classList(lines: string[]): string {
  if (lines.length === 0) return '';
  return `<ul style="margin: 0 0 1rem; padding-left: 1.25rem; line-height: 1.6;">${lines
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('')}</ul>`;
}

export function billingPacketStudentHtml(params: { firstName: string; facts: BillingPacketEmailFacts; documentsUrl: string }): string {
  const { firstName, facts, documentsUrl } = params;
  return `
    <p style="margin: 0 0 1rem; line-height: 1.6;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      Attached are the signed enrollment documents for your <strong>${escapeHtml(facts.programTitle)}</strong> training:
      the training invoice (Form J5) and its cover letter (Form J6). They list your classes and the price of each one.
    </p>
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      <strong>There is no cost to you.</strong> The invoice is billed to ${escapeHtml(facts.billToName)}, your funding partner.
      Keep these for your records, and share them if your case manager asks for proof of enrollment.
    </p>
    ${classList(facts.classLines)}
    ${factsTable(facts)}
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      You can also download both documents anytime from your member portal:
      <a href="${escapeHtml(documentsUrl)}" style="color: #ad2c4d; font-weight: 600;">My documents</a>.
    </p>
    <p style="margin: 0; line-height: 1.6;">Questions? Reply to this email or message your counselor from the portal.</p>
  `.trim();
}

export function billingPacketCounselorHtml(params: {
  counselorFirstName: string;
  facts: BillingPacketEmailFacts;
  studentUrl: string;
  memberEmail: string;
}): string {
  const { counselorFirstName, facts, studentUrl, memberEmail } = params;
  return `
    <p style="margin: 0 0 1rem; line-height: 1.6;">Hi ${escapeHtml(counselorFirstName)},</p>
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      The signed training invoice (Form J5) and cover letter (Form J6) for your student
      <strong>${escapeHtml(facts.memberName)}</strong> (${escapeHtml(memberEmail)}) are attached. The same copy went to the student.
    </p>
    ${factsTable(facts)}
    ${classList(facts.classLines)}
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      <a href="${escapeHtml(studentUrl)}" style="color: #ad2c4d; font-weight: 600;">Open the student record</a>
      to see the packet history and download the PDFs again later.
    </p>
    <p style="margin: 0; line-height: 1.6; color: #737373; font-size: 14px;">
      Forward the J5 and J6 to the funding partner if they have not already received them from the office.
    </p>
  `.trim();
}
