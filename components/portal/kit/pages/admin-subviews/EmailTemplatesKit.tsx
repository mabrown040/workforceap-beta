'use client';

import { Mail } from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  StatusTag,
  type KpiItem,
  type Column,
} from '@/components/portal/kit';

/**
 * Email Templates — admin transactional templates rendered as a dense table.
 * No mockup; consistent dense-kit treatment mirroring BlogKit.
 * Target route: /admin/email-templates
 *
 * Columns: Template · Subject · Variables · Updated · Status.
 * Status is a StatusTag (Active=ok, Inactive=muted). A KpiStrip surfaces real
 * total / active / inactive counts. Editing, preview, and test-send live in the
 * richer legacy view, reachable via the header action (?ui=legacy).
 */

export interface EmailTemplateRow {
  id: string;
  /** Stable lookup key, e.g. "welcome_member". */
  key: string;
  name: string;
  subject: string;
  /** Number of {variable} placeholders the template accepts. */
  variableCount: number;
  active: boolean;
  /** Pre-formatted updated date, e.g. "Jun 10". */
  updated: string;
}

export interface EmailTemplatesKitProps {
  templates?: EmailTemplateRow[];
}

const DEFAULT_TEMPLATES: EmailTemplateRow[] = [
  {
    id: 'welcome',
    key: 'welcome_member',
    name: 'Welcome Member',
    subject: 'Welcome to WorkforceAP, {firstName}',
    variableCount: 2,
    active: true,
    updated: 'Jun 10',
  },
  {
    id: 'password-reset',
    key: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your password',
    variableCount: 1,
    active: true,
    updated: 'Jun 18',
  },
];

export function EmailTemplatesKit({ templates = DEFAULT_TEMPLATES }: EmailTemplatesKitProps) {
  const total = templates.length;
  const active = templates.filter((t) => t.active).length;
  const inactive = total - active;

  const kpis: KpiItem[] = [
    { label: 'Templates', value: total, color: 'text' },
    { label: 'Active', value: active, color: 'success' },
    { label: 'Inactive', value: inactive, color: 'muted' },
  ];

  const columns: Column<EmailTemplateRow>[] = [
    {
      key: 'name',
      header: 'Template',
      render: (row) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{row.name}</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--wa-muted)',
              fontFamily: 'var(--wa-mono, monospace)',
            }}
          >
            {row.key}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <span
          style={{
            color: 'var(--wa-muted)',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 320,
          }}
        >
          {row.subject}
        </span>
      ),
    },
    {
      key: 'variableCount',
      header: 'Variables',
      align: 'right',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)', whiteSpace: 'nowrap' }}>
          {row.variableCount === 0 ? '—' : row.variableCount}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)', whiteSpace: 'nowrap' }}>{row.updated}</span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <StatusTag tone={row.active ? 'ok' : 'muted'}>
          {row.active ? 'Active' : 'Inactive'}
        </StatusTag>
      ),
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Email Templates"
        kicker="Messaging"
        goal="Transactional emails sent to members and staff"
        action={
          <a
            href="/admin/email-templates?ui=legacy"
            className="wa-kit-focus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              background: 'var(--wa-accent)',
              color: '#fff',
            }}
          >
            <Mail className="h-4 w-4" /> Preview &amp; Edit
          </a>
        }
      />

      <div className="wa-mt-4 wa-mb-4">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<EmailTemplateRow>
        columns={columns}
        rows={templates}
        rowKey={(row) => row.id}
        minWidth={760}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--wa-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.subject}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={row.active ? 'ok' : 'muted'}>
                  {row.active ? 'Active' : 'Inactive'}
                </StatusTag>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: 'var(--wa-muted)',
                marginTop: 12,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--wa-mono, monospace)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.key}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>Updated {row.updated}</span>
            </div>
          </div>
        )}
        emptyTitle="No email templates yet"
        emptyDescription="Transactional templates will appear here once seeded."
      />
    </DesignSurface>
  );
}
