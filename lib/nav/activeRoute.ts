export type ActiveNavLink = {
  href: string;
  aliases?: string[];
};

function matchesPrefix(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActiveRoute(pathname: string, href: string, aliases: string[] = []): boolean {
  if (matchesPrefix(pathname, href)) return true;
  return aliases.some((alias) => matchesPrefix(pathname, alias));
}

export function getBestActiveHref(pathname: string, links: ActiveNavLink[]): string | null {
  const matches = links.filter((link) => isActiveRoute(pathname, link.href, link.aliases));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
