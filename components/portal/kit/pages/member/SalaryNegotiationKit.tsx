import { Handshake } from 'lucide-react';
import SalaryNegotiationForm from '@/components/portal/tools/SalaryNegotiationForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — salary negotiation tool page.
 * PageOpener chrome around SalaryNegotiationForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/salary-negotiation
 * Proof: /dev/member/salary-negotiation
 * Surface: warm (member-facing).
 */

export function SalaryNegotiationKit({
  userId,
  preview = false,
  backHref,
  initialOffer,
  initialTarget,
  initialJobTitle,
  initialCompany,
  initialDelivery,
  previewOutput,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialOffer?: string;
  initialTarget?: string;
  initialJobTitle?: string;
  initialCompany?: string;
  initialDelivery?: 'phone' | 'email';
  previewOutput?: string;
}) {
  return (
    <ToolkitToolChrome
      title="Salary negotiation"
      lede="Write a phone or email script from the offer and target."
      icon={<Handshake size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <SalaryNegotiationForm
          preview={preview}
          initialOffer={initialOffer}
          initialTarget={initialTarget}
          initialJobTitle={initialJobTitle}
          initialCompany={initialCompany}
          initialDelivery={initialDelivery}
          previewOutput={previewOutput}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="salary_negotiation" /> : null}
    </ToolkitToolChrome>
  );
}
