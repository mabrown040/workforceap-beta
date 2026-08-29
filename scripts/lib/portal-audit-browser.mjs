export const PORTAL_AUDIT_VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'desktop', width: 1440, height: 900 }),
  Object.freeze({ name: 'mobile', width: 390, height: 844 }),
]);

export const PORTAL_AUDIT_NAVIGATION_TIMEOUT_MS = 20_000;
export const PORTAL_AUDIT_READY_TIMEOUT_MS = 5_000;

export function sanitizeAuditUrl(value) {
  try {
    const url = new URL(String(value));
    const pathname = redactDynamicHrefPath(url.pathname);
    const sanitized = `${url.protocol}//${url.host}${pathname}`;
    return sanitized.replace(/\/$/, pathname === '/' ? '/' : '');
  } catch {
    const pathname = String(value ?? '').split(/[?#]/, 1)[0];
    return pathname.startsWith('/') ? redactDynamicHrefPath(pathname) : pathname;
  }
}

export function sanitizeAuditDiagnostic(value) {
  let text = String(value ?? '');
  text = text.replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => sanitizeAuditUrl(candidate));
  text = text.replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]');
  text = text.replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, '[token-redacted]');
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email-redacted]');
  text = text.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    '[id-redacted]'
  );
  text = text.replace(
    /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g,
    '[phone-redacted]'
  );
  text = text.replace(
    /\b(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}\b/g,
    '[id-redacted]'
  );
  text = text.replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password)=([^\s&]+)/gi, '$1=[redacted]');
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function normalizedPathSegments(value) {
  const pathname = String(value ?? '').split(/[?#]/, 1)[0];
  return pathname.split('/').filter(Boolean);
}

function matchesDynamicPattern(pathSegments, patternSegments) {
  if (pathSegments.length !== patternSegments.length) return false;
  return patternSegments.every((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) return true;
    return segment === pathSegments[index];
  });
}

/** Redact route identifiers while retaining enough structure to diagnose an unnamed link. */
export function redactDynamicHrefPath(value, dynamicPatterns = []) {
  const rawPath = String(value ?? '').split(/[?#]/, 1)[0] || '/';
  const pathSegments = normalizedPathSegments(rawPath);

  for (const pattern of dynamicPatterns ?? []) {
    const patternSegments = normalizedPathSegments(pattern);
    if (!matchesDynamicPattern(pathSegments, patternSegments)) continue;
    return `/${patternSegments
      .map((segment, index) =>
        segment.startsWith('[') && segment.endsWith(']') ? '[redacted]' : pathSegments[index]
      )
      .join('/')}`;
  }

  return `/${pathSegments
    .map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Malformed percent encoding is itself untrusted diagnostic input.
      }
      const looksSensitive =
        /^\d{6,}$/.test(decoded) ||
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decoded) ||
        /^[a-z0-9_-]{20,}$/i.test(decoded) ||
        decoded.includes('@');
      return looksSensitive ? '[redacted]' : segment;
    })
    .join('/')}`;
}

/** Deterministic readiness gate; avoids unbounded network-idle waits on polling portals. */
export async function waitForPortalReady(page, timeout = PORTAL_AUDIT_READY_TIMEOUT_MS) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.locator('body').waitFor({ state: 'visible', timeout });
  await page.waitForFunction(
    () => document.readyState === 'interactive' || document.readyState === 'complete',
    undefined,
    { timeout }
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
      const hasHeading = Boolean(document.querySelector('h1'));
      const hasControl = Boolean(document.querySelector('button, a[href], input, select, textarea'));
      return bodyText.length >= 20 && (hasHeading || hasControl);
    },
    undefined,
    { timeout }
  );
}

/** Collect route-level layout and accessible-name signals in the page. */
export async function inspectPortalPage(page, dynamicPatterns = []) {
  const inspection = await page.evaluate(() => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
      if (element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    };

    const referencedLabel = (element) => {
      const ids = element.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
      return ids
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .trim();
    };

    const accessibleName = (element) => {
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;
      const labelledBy = referencedLabel(element);
      if (labelledBy) return labelledBy;
      if (element instanceof HTMLInputElement) {
        const inputName = element.alt?.trim() || element.value?.trim();
        if (inputName) return inputName;
      }
      const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
      if (imageAlt) return imageAlt;
      const title = element.getAttribute('title')?.trim();
      if (title) return title;
      return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    };

    const controls = [
      ...document.querySelectorAll(
        'button, a[href], [role="button"], [role="link"], input[type="button"], input[type="submit"], input[type="reset"], input[type="image"]'
      ),
    ].filter(isVisible);
    const unnamedControls = controls.filter((element) => !accessibleName(element));

    const rootWidth = Math.max(
      document.documentElement?.scrollWidth ?? 0,
      document.body?.scrollWidth ?? 0
    );
    const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
    const visibleH1Count = [...document.querySelectorAll('h1')].filter(isVisible).length;
    const normalizedBodyText = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();

    return {
      bodyText: document.body?.innerText ?? '',
      appReady: normalizedBodyText.length >= 20 && (visibleH1Count > 0 || controls.length > 0),
      h1Count: visibleH1Count,
      horizontalOverflowPx: Math.max(0, Math.ceil(rootWidth - viewportWidth)),
      interactiveControlCount: controls.length,
      unnamedInteractiveControlCount: unnamedControls.length,
      unnamedInteractiveControls: unnamedControls.slice(0, 25).map((element) => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role') || null,
        hrefPath:
          element instanceof HTMLAnchorElement && element.href
            ? new URL(element.href, window.location.href).pathname
            : null,
      })),
    };
  });

  return {
    ...inspection,
    unnamedInteractiveControls: inspection.unnamedInteractiveControls.map((control) => ({
      ...control,
      hrefPath: control.hrefPath
        ? redactDynamicHrefPath(control.hrefPath, dynamicPatterns)
        : null,
    })),
  };
}

export function pendingDynamicRoutes(patterns) {
  return (patterns ?? []).map((pattern) => ({
    pattern,
    status: 'pending',
    reason: 'requires_discoverable_safe_fixture',
  }));
}
