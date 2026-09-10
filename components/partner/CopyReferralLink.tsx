'use client';

import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Check, Copy } from 'lucide-react';
import { useAnnounce } from '@/components/portal/kit/hooks/useAnnounce';

export default function CopyReferralLink({
  url,
  referralCodeDisplay,
  onCopyError,
}: {
  url: string;
  /** Shown beside actions so partners can read their code aloud. */
  referralCodeDisplay?: string;
  /** Reveals a manual-copy fallback when the browser denies clipboard access. */
  onCopyError?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'err'>('idle');
  const announce = useAnnounce();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      announce('Referral link copied.');
    } catch {
      setState('err');
      onCopyError?.();
      announce('Copy failed. Select and copy your referral link manually.', 'assertive');
    }
  };

  return (
    <VStack gap={2}>
      <HStack gap={3} wrap="wrap" vAlign="center">
        <Button
          variant="primary"
          label={state === 'copied' ? 'Link copied' : 'Copy referral link'}
          icon={state === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          onClick={() => void copy()}
        />
        {referralCodeDisplay ? <Text type="supporting">Referral code: {referralCodeDisplay}</Text> : null}
      </HStack>
      {state === 'err' ? <Text as="p">Copy failed. Select and copy your referral link manually.</Text> : null}
    </VStack>
  );
}
