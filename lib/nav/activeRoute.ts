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
  let bestHref: string | null = null;
  let bestLength = -1;
  for (const link of links) {
    for (const candidate of [link.href, ...(link.aliases ?? [])]) {
      if (matchesPrefix(pathname, candidate) && candidate.length > bestLength) {
        bestHref = link.href;
        bestLength = candidate.length;
      }
    }
  }
  return bestHref;
}
