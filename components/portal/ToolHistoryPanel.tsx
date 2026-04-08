import Link from 'next/link';
import type { AIToolType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { isMissingPrismaEnumValue } from '@/lib/db/prismaEnumFallback';

function compactPreview(output: string): string {
  const text = output.replace(/\s+/g, ' ').trim();
  if (!text) return 'No output captured.';
  if (text.length <= 180) return text;
  return `${text.slice(0, 180)}…`;
}

function formatOutput(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) return 'No output captured.';
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return output;
  }
}

export default async function ToolHistoryPanel({
  userId,
  toolType,
  toolTypes,
  title = 'Recent saved runs',
  limit = 5,
  emptyMessage = 'No saved runs yet for this tool. This history section will appear after your first run.',
}: {
  userId: string;
  toolType?: AIToolType;
  toolTypes?: AIToolType[];
  title?: string;
  limit?: number;
  emptyMessage?: string;
}) {
  const resolvedToolTypes = (toolTypes?.length ? toolTypes : toolType ? [toolType] : []) as AIToolType[];
  if (resolvedToolTypes.length === 0) return null;

  const historyHrefTool = resolvedToolTypes[0];
  let rows: Array<{
    id: string;
    inputSummary: string;
    output: string;
    createdAt: Date;
  }> = [];
  let historyUnavailable = false;

  try {
    rows = await prisma.aIToolResult.findMany({
      where: {
        userId,
        toolType: resolvedToolTypes.length === 1 ? resolvedToolTypes[0] : { in: resolvedToolTypes },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        inputSummary: true,
        output: true,
        createdAt: true,
      },
    });
  } catch (error) {
    const missingEnum = resolvedToolTypes.some((value) => isMissingPrismaEnumValue(error, value));
    if (!missingEnum) throw error;
    historyUnavailable = true;
    console.error('[ToolHistoryPanel] missing database enum value for tool history', {
      userId,
      toolTypes: resolvedToolTypes,
    });
  }

  return (
    <section className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12, marginTop: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{title}</h3>
        <Link
          href={`/dashboard/ai-tools/history?tool=${historyHrefTool}`}
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          View all
        </Link>
      </div>

      {historyUnavailable ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
          Saved history is temporarily unavailable while this tool finishes syncing in the database.
        </p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
          {emptyMessage}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {rows.map((row) => (
            <details
              key={row.id}
              style={{
                border: '1px solid var(--outline-variant)',
                borderRadius: 10,
                background: 'var(--surface-container-low)',
                padding: '0.6rem 0.75rem',
              }}
            >
              <summary style={{ cursor: 'pointer' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '100%' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                    {row.inputSummary}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {row.createdAt.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-on-surface-variant)',
                      lineHeight: 1.45,
                    }}
                  >
                    {compactPreview(row.output)}
                  </span>
                </div>
              </summary>
              <pre
                style={{
                  margin: '0.65rem 0 0',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.76rem',
                  lineHeight: 1.45,
                  color: 'var(--color-on-surface)',
                }}
              >
                {formatOutput(row.output)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
