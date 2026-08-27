import { Scale } from 'lucide-react';
import BenefitsCliffClient from '@/components/portal/BenefitsCliffClient';
import { StatusTag } from '@/components/portal/kit';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — benefits cliff calculator.
 * PageOpener chrome around BenefitsCliffClient.
 *
 * Target route: app/(portal)/dashboard/ai-tools/benefits-cliff
 * Proof: /dev/member/benefits-cliff
 * Surface: warm (member-facing).
 */

export function BenefitsCliffKit({
  title,
  lede,
  betaLabel,
  backHref = '/dashboard/ai-tools',
}: {
  title: string;
  lede: string;
  betaLabel?: string;
  backHref?: string;
}) {
  return (
    <ToolkitToolChrome
      title={title}
      lede={lede}
      icon={<Scale size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={900}
    >
      {betaLabel ? <StatusTag tone="info">{betaLabel}</StatusTag> : null}
      <BenefitsCliffClient />
    </ToolkitToolChrome>
  );
}
