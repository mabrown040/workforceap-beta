import 'server-only';

/**
 * Fire-and-forget Discord webhook bridge for operator visibility.
 *
 * Goal: when something noteworthy happens on the platform — a new
 * member↔employer message, a new high-signal Notification row,
 * etc. — Mike (operator) sees it in a dedicated Discord channel
 * without having to poll any admin dashboard.
 *
 * Hard rules:
 * - Never block the caller. Failures swallow + console.error.
 * - Skip when no webhook URL is configured.
 * - Skip in non-production unless DISCORD_NOTIFICATIONS_FORCE=1
 *   so local/preview branches don't spam the channel.
 * - Truncate field values defensively — Discord caps embeds at
 *   well under 6000 chars total, and bulk events can blow past it.
 *
 * Discord webhook rate-limit is 30/min per webhook. We don't try
 * to throttle here; callers should avoid loops that fire one
 * webhook per row. Bulk paths should aggregate into one event.
 */

export type DiscordNotificationLevel = 'info' | 'success' | 'warn';

export interface DiscordNotificationInput {
  /** Short title shown bold at the top of the embed. */
  title: string;
  /** Main body text. Markdown supported by Discord. */
  body: string;
  /** Optional canonical URL for click-through (e.g. portal link). */
  url?: string | null;
  /** Optional category tag shown as a field, e.g. "message" or "audit". */
  category?: string | null;
  /** Optional named fields rendered as inline embed fields. */
  fields?: Array<{ name: string; value: string }>;
  /** Visual severity hint — maps to embed color. */
  level?: DiscordNotificationLevel;
}

const LEVEL_COLORS: Record<DiscordNotificationLevel, number> = {
  info: 0x5865f2,
  success: 0x57f287,
  warn: 0xfee75c,
};

const MAX_TITLE = 240;
const MAX_BODY = 1800;
const MAX_FIELD_VALUE = 800;

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

function shouldSend(): boolean {
  if (!process.env.DISCORD_NOTIFICATIONS_WEBHOOK_URL) return false;
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.DISCORD_NOTIFICATIONS_FORCE === '1';
}

/**
 * POST a single embed to the configured Discord webhook.
 *
 * Callers should not await this unless they specifically need to
 * serialize on it — it is fire-and-forget by design.
 */
export async function notifyDiscord(input: DiscordNotificationInput): Promise<void> {
  if (!shouldSend()) return;

  const url = process.env.DISCORD_NOTIFICATIONS_WEBHOOK_URL!;
  const level: DiscordNotificationLevel = input.level ?? 'info';

  const embed: Record<string, unknown> = {
    title: truncate(input.title, MAX_TITLE),
    description: truncate(input.body, MAX_BODY),
    color: LEVEL_COLORS[level],
    timestamp: new Date().toISOString(),
  };

  if (input.url) {
    embed.url = input.url;
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  if (input.category) {
    fields.push({ name: 'Category', value: input.category, inline: true });
  }
  if (input.fields) {
    for (const f of input.fields) {
      fields.push({
        name: truncate(f.name, 240),
        value: truncate(f.value, MAX_FIELD_VALUE),
        inline: true,
      });
    }
  }
  if (fields.length > 0) {
    embed.fields = fields;
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'WorkforceAP',
        embeds: [embed],
      }),
      // Don't let a hung webhook stall a request handler.
      signal: AbortSignal.timeout(2500),
    });
  } catch (error) {
    console.error('[discord-notify] post failed:', error);
  }
}
