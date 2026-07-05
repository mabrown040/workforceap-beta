'use client';

// Astryx Lab index — built with Astryx's own components so the page itself
// proves the library renders. Template proofs live in the sub-routes.
// Conventions per `astryx docs principles`: components over primitives,
// spacing via gap={n} number steps, no raw hex/px in style values.
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';

const PROOFS = [
  {
    href: '/dev/astryx/dashboard',
    title: 'Analytics Dashboard',
    body: 'KPI cards, recharts area/bar charts, and a data table — the `dashboard` page template.',
  },
  {
    href: '/dev/astryx/table',
    title: 'Grouped Table',
    body: 'Collapsible status sections, PowerSearch, resizable detail panel — the `table-grouped` template.',
  },
  {
    href: '/dev/astryx/settings',
    title: 'Settings Panels',
    body: 'Nav-switched panels with inline row editing — the `settings-sidebar` template.',
  },
  {
    href: '/dev/astryx/overlays',
    title: 'Production overlays',
    body: 'The real ConfirmDialog (Astryx Dialog) and GlobalSearch (CommandPalette) now shipped in admin.',
  },
];

export default function AstryxLabIndex() {
  return (
    <VStack gap={6} maxWidth={720} paddingBlock={8} paddingInline={3} as="main" hAlign="stretch" style={{ margin: '0 auto' }}>
      <VStack gap={2}>
        <HStack gap={2} align="center">
          <Heading level={1}>Astryx Lab</Heading>
          <Badge label="dev proof" />
        </HStack>
        <Text color="secondary">
          Scoped proving ground for @astryxdesign/core (neutral theme). CSS is imported only in
          this route segment — Astryx&apos;s --color-* tokens collide with the app&apos;s legacy
          family, so nothing here leaks into the portal. Workflow: `pnpm exec astryx build
          &quot;idea&quot;` → `template` → `component`.
        </Text>
      </VStack>
      <Divider />
      <VStack gap={3}>
        {PROOFS.map((p) => (
          <ClickableCard key={p.href} href={p.href} label={p.title}>
            <VStack gap={1}>
              <Heading level={3}>{p.title}</Heading>
              <Text color="secondary">{p.body}</Text>
            </VStack>
          </ClickableCard>
        ))}
      </VStack>
    </VStack>
  );
}
