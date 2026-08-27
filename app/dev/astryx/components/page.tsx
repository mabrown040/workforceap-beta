'use client';

// Components sampler — covers the Astryx primitives requested for portal use
// that the page templates and shipped surfaces don't already demonstrate:
// Calendar, CheckboxInput, Thumbnail, ChatSystemMessage, Markdown, plus a
// side-by-side of the production-adopted set (SegmentedControl, StatusDot,
// Token, Spinner, ProgressBar, Breadcrumbs, Pagination, Avatar).
import { useState } from 'react';
import Link from 'next/link';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { Calendar } from '@astryxdesign/core/Calendar';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { ChatMessageList, ChatMessage, ChatMessageBubble, ChatSystemMessage } from '@astryxdesign/core/Chat';
import { Markdown } from '@astryxdesign/core/Markdown';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Avatar } from '@astryxdesign/core/Avatar';
import ThemeSelector from '@/components/theme/ThemeSelector';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';

const MD_SAMPLE = `**Interview prep plan**

1. Review the *job description* and match 3 stories to it
2. Practice the STAR format — [voice interview](/dashboard/ai-tools/voice-interview)
3. Prepare two questions for the interviewer`;

export default function AstryxComponentsSampler() {
  const [date, setDate] = useState<string | undefined>(undefined);
  const [consent, setConsent] = useState(false);
  const [view, setView] = useState('week');
  const [page, setPage] = useState(3);

  return (
    <VStack gap={6} maxWidth={760} paddingBlock={8} paddingInline={3} as="main" style={{ margin: '0 auto' }}>
      <VStack gap={2}>
        <Heading level={1}>Components sampler</Heading>
        <Text color="secondary">
          The primitives now used across the portal (ThemeSelector, coach chat, members roster,
          breadcrumbs, pagers, chart loading) plus the ones the templates don&apos;t cover.
        </Text>
        <Breadcrumbs variant="supporting">
          <BreadcrumbItem href="/dev/astryx" as={Link as never}>Astryx Lab</BreadcrumbItem>
          <BreadcrumbItem isCurrent>Components</BreadcrumbItem>
        </Breadcrumbs>
      </VStack>
      <Divider />

      <VStack gap={3}>
        <Heading level={3}>Production components (as shipped)</Heading>
        <Text type="supporting">
          The real ThemeSelector (SegmentedControl — switching Dark here flips the whole app) and
          the real PortalBreadcrumb (Astryx Breadcrumbs) used by PageHeader across 140 portal pages.
        </Text>
        <ThemeSelector />
        <PortalBreadcrumb
          items={[{ href: '/dev/astryx', label: 'Career Toolkit' }, { href: '/dev/astryx', label: 'Resume Studio' }, { label: 'Score' }]}
        />
      </VStack>
      <Divider />

      <VStack gap={3}>
        <Heading level={3}>SegmentedControl · StatusDot · Token · Spinner</Heading>
        <HStack gap={4} align="center" wrap="wrap">
          <SegmentedControl value={view} onChange={setView} label="View" size="sm">
            <SegmentedControlItem value="day" label="Day" />
            <SegmentedControlItem value="week" label="Week" />
            <SegmentedControlItem value="month" label="Month" />
          </SegmentedControl>
          <HStack gap={2} align="center">
            <StatusDot variant="success" label="Active" isPulsing />
            <StatusDot variant="warning" label="At risk" />
            <StatusDot variant="error" label="Inactive" />
          </HStack>
          <HStack gap={1} align="center" wrap="wrap">
            <Token label="Cloud & IT" color="blue" size="sm" />
            <Token label="Healthcare" color="green" size="sm" onRemove={() => {}} />
            <Token label="Skilled Trades" color="yellow" size="sm" />
          </HStack>
          <Spinner size="md" label="Loading charts" />
        </HStack>
      </VStack>
      <Divider />

      <VStack gap={3}>
        <Heading level={3}>ProgressBar · Pagination · Avatar</Heading>
        <ProgressBar value={68} max={100} label="Program progress" />
        <HStack gap={4} align="center" wrap="wrap">
          <Pagination page={page} totalPages={12} onChange={setPage} label="Sampler pagination" size="sm" />
          <HStack gap={1} align="center">
            <Avatar name="Jasmine Davis" size="sm" />
            <Avatar name="Mike Brown" size="sm" />
            <Avatar name="Carlos Torres" size="sm" />
          </HStack>
        </HStack>
      </VStack>
      <Divider />

      <VStack gap={3}>
        <Heading level={3}>Calendar · CheckboxInput · Thumbnail</Heading>
        <HStack gap={6} align="start" wrap="wrap">
          <Calendar mode="single" value={date as never} onChange={(v) => setDate(v as string)} />
          <VStack gap={3} maxWidth={280}>
            <CheckboxInput
              label="Share progress with my counselor"
              description="Your counselor sees training status and readiness score."
              value={consent}
              onChange={setConsent}
            />
            <Thumbnail src="/images/icon-192x192.png" alt="Uploaded resume preview" label="resume_final.pdf" onRemove={() => {}} />
          </VStack>
        </HStack>
      </VStack>
      <Divider />

      <VStack gap={3}>
        <Heading level={3}>Chat suite · Markdown (as used by the coach at /coach)</Heading>
        <ChatMessageList density="compact">
          <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
          <ChatMessage sender="user">
            <ChatMessageBubble>How do I get ready for my interview Friday?</ChatMessageBubble>
          </ChatMessage>
          <ChatMessage sender="assistant" avatar={<Avatar name="Coach" size="sm" />} name="Coach">
            <Markdown density="compact" headingLevelStart={3}>{MD_SAMPLE}</Markdown>
          </ChatMessage>
        </ChatMessageList>
      </VStack>
    </VStack>
  );
}
