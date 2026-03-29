#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 20000;
const CRITICAL_ROUTES = [
  '/',
  '/programs',
  '/apply',
  '/login',
  '/faq',
  '/contact',
  '/jobs',
];

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function trimSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function main() {
  if (hasFlag('--list-only')) {
    for (const route of CRITICAL_ROUTES) {
      console.log(route);
    }
    return;
  }

  const baseUrl = trimSlash(
    readArgValue('--url') || process.env.PREVIEW_URL || process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,
  );
  const timeoutMs = Number.parseInt(readArgValue('--timeout-ms') || '', 10) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const failures = [];
  try {
    for (const route of CRITICAL_ROUTES) {
      const url = `${baseUrl}${route}`;
      let response;
      try {
        response = await fetch(url, {
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'user-agent': 'workforceap-preview-check/1.0' },
        });
      } catch (error) {
        failures.push(`${route} request failed: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      if (!response.ok) {
        failures.push(`${route} returned ${response.status}`);
        continue;
      }
      if (!contentType.includes('text/html')) {
        failures.push(`${route} returned unexpected content-type: ${contentType || 'missing'}`);
        continue;
      }
      if (!body.includes('<main') && !body.includes('<body')) {
        failures.push(`${route} did not look like an application page`);
        continue;
      }
      console.log(`ok ${route} ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }

  if (failures.length > 0) {
    console.error('Preview verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
