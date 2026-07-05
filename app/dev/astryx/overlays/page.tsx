'use client';

// Proof page for the two production surfaces now running on Astryx:
// ConfirmDialog (Astryx Dialog internals) and GlobalSearch (CommandPalette).
// The admin routes that consume them need Supabase auth, so this dev page
// mounts them directly. /api/admin/search will 401 here — the palette's
// bootstrap quick links and empty states still demonstrate the component.
import { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import GlobalSearch from '@/components/portal/GlobalSearch';

export default function AstryxOverlaysProof() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('none');

  return (
    <VStack gap={6} maxWidth={720} paddingBlock={8} paddingInline={3} as="main" style={{ margin: '0 auto' }}>
      <VStack gap={2}>
        <Heading level={1}>Overlay replacements</Heading>
        <Text color="secondary">
          Production components rebuilt on Astryx: the shared admin ConfirmDialog (Astryx Dialog)
          and the admin ⌘K GlobalSearch (Astryx CommandPalette).
        </Text>
      </VStack>
      <Divider />
      <VStack gap={3}>
        <Heading level={3}>ConfirmDialog</Heading>
        <HStack gap={2}>
          <Button label="Open confirm" variant="primary" onClick={() => setConfirmOpen(true)} />
          <Button label="Open destructive confirm" variant="destructive" onClick={() => setDangerOpen(true)} />
        </HStack>
        <Text size="sm" color="secondary">Last action: {lastAction}</Text>
      </VStack>
      <Divider />
      <VStack gap={3}>
        <Heading level={3}>GlobalSearch (⌘K)</Heading>
        <GlobalSearch />
      </VStack>

      <ConfirmDialog
        open={confirmOpen}
        title="Publish changes?"
        body="Members will see the updated program catalog immediately."
        confirmLabel="Publish"
        onConfirm={() => { setLastAction('published'); setConfirmOpen(false); }}
        onCancel={() => { setLastAction('cancelled publish'); setConfirmOpen(false); }}
      />
      <ConfirmDialog
        open={dangerOpen}
        danger
        title="Delete this record?"
        body="This permanently removes the record. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { setLastAction('deleted'); setDangerOpen(false); }}
        onCancel={() => { setLastAction('cancelled delete'); setDangerOpen(false); }}
      />
    </VStack>
  );
}
