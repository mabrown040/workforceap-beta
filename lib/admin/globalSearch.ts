import { normalizeDirectorySearch } from './directorySearch';

export type GlobalSearchType = 'member' | 'staff' | 'account' | 'employer' | 'partner' | 'job';
export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchType;
  label: string;
  sublabel?: string;
  href: string;
  icon: string;
};

const STAFF_ROLES = new Set(['admin', 'super_admin', 'case_manager', 'counselor']);

export function userSearchResult(user: {
  id: string;
  fullName: string | null;
  email: string;
  enrolledProgram: string | null;
  profile: { role: string } | null;
  userRoles: Array<{ role: { name: string } }>;
}): GlobalSearchResult {
  const roles = [user.profile?.role ?? 'member', ...user.userRoles.map(grant => grant.role.name)];
  const type = roles.some(role => STAFF_ROLES.has(role)) ? 'staff'
    : roles.some(role => role !== 'member') ? 'account' : 'member';
  const details = type === 'member' ? user.enrolledProgram
    : [...new Set(roles.filter(role => role !== 'member'))].sort().map(role => role.replace(/_/g, ' ')).join(', ');
  return {
    id: user.id,
    type,
    label: user.fullName?.trim() || user.email,
    sublabel: `${user.email}${details ? ` · ${details}` : ''}`,
    href: type === 'member' ? `/admin/members/${user.id}`
      : `/admin/users?ui=legacy&search=${encodeURIComponent(user.email)}`,
    icon: type === 'member' ? 'person' : 'manage_accounts',
  };
}

export function globalSearchKey(result: Pick<GlobalSearchResult, 'type' | 'id'>): string {
  return `${result.type}:${result.id}`;
}

function matchScore(result: GlobalSearchResult, query: string): number {
  const label = normalizeDirectorySearch(result.label).toLowerCase();
  const detail = normalizeDirectorySearch(result.sublabel ?? '').toLowerCase();
  const email = detail.split(' · ')[0];
  if (label === query || email === query) return 0;
  if (label.startsWith(query) || email.startsWith(query)) return 1;
  if (query.split(' ').every(token => `${label} ${detail}`.split(/\s+/).some(word => word.startsWith(token)))) return 2;
  return 3;
}

/** Exact name/email, prefix and token matches precede stable lexical ties. */
export function rankGlobalSearchResults(results: GlobalSearchResult[], query: string, limit: number): GlobalSearchResult[] {
  const normalized = normalizeDirectorySearch(query).toLowerCase();
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const unique = new Map(results.map(result => [globalSearchKey(result), result]));
  return [...unique.values()].sort((a, b) => matchScore(a, normalized) - matchScore(b, normalized)
    || compare(a.label.toLowerCase(), b.label.toLowerCase())
    || compare(globalSearchKey(a), globalSearchKey(b))).slice(0, limit);
}
