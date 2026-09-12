export type PlacementSurveyDeliveryPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  idempotencyKey: string;
};

export function createPlacementSurveyDeliveryPayload(
  payload: PlacementSurveyDeliveryPayload,
): PlacementSurveyDeliveryPayload {
  return { ...payload };
}

export function readPlacementSurveyDeliveryPayload(
  value: unknown,
): PlacementSurveyDeliveryPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.from !== 'string'
    || typeof row.to !== 'string'
    || typeof row.subject !== 'string'
    || typeof row.html !== 'string'
    || typeof row.text !== 'string'
    || !row.headers
    || typeof row.headers !== 'object'
    || Array.isArray(row.headers)
    || Object.values(row.headers as Record<string, unknown>).some((item) => typeof item !== 'string')
    || typeof row.idempotencyKey !== 'string'
  ) return null;

  return {
    from: row.from,
    to: row.to,
    subject: row.subject,
    html: row.html,
    text: row.text,
    headers: { ...(row.headers as Record<string, string>) },
    idempotencyKey: row.idempotencyKey,
  };
}
