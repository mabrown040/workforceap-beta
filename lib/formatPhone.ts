/**
 * Format phone numbers for display.
 * (512) 629-1505
 * Strips country code prefix (1) if present.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '—';
  // US: strip leading 1
  let d = digits;
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw; // fallback for non-US
}
