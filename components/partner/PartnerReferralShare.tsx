import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { CardHead } from '@/components/portal/kit';
import CopyReferralLink from '@/components/partner/CopyReferralLink';

/** Existing attribution, brought into the default journey; copying never sends. */
export default function PartnerReferralShare({
  url,
  referralCode,
}: {
  url: string;
  referralCode: string;
}) {
  return (
    <section className="wa-kit-card" aria-label="Share your referral link">
      <CardHead title="Share your referral link" />
      <VStack gap={3}>
        <Text as="p">Use this link when referring someone so their application records your organization.</Text>
        <a href={url} className="wa-kit-focus wa-break-all">{url}</a>
        <CopyReferralLink url={url} referralCodeDisplay={referralCode} />
      </VStack>
    </section>
  );
}
