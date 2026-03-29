#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const ciNodeMajor = 22;

function hasFile(target) {
  try {
    fs.accessSync(target, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(target) {
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    return null;
  }
}

function commandVersion(command, args = ['--version']) {
  try {
    const output = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, output: output.split('\n')[0] || 'available' };
  } catch (error) {
    return {
      ok: false,
      output: error.stderr?.toString().trim() || error.message,
    };
  }
}

function commandCheck(command, args = []) {
  try {
    const output = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, output: output.split('\n')[0] || 'available' };
  } catch (error) {
    return {
      ok: false,
      output: error.stderr?.toString().trim() || error.message,
    };
  }
}

function printStatus(label, status, detail) {
  const marker = status === 'ok' ? '[ok]' : status === 'warn' ? '[warn]' : '[missing]';
  console.log(`${marker} ${label}: ${detail}`);
}

function getNodeMajor() {
  const version = process.versions.node || '';
  return Number(version.split('.')[0] || 0);
}

console.log('WorkforceAP tooling doctor');
console.log(`repo: ${repoRoot}`);
console.log('');

const checks = [
  ['git', commandVersion('git')],
  ['node', commandVersion('node')],
  ['npm', commandVersion('npm')],
  ['vercel', commandVersion('vercel')],
  ['supabase', commandVersion('supabase', ['--version'])],
  ['codex', commandVersion('codex', ['--version'])],
  ['claude', commandVersion('claude', ['--version'])],
  ['kimi', commandVersion('kimi', ['--version'])],
  ['jules', commandVersion('jules', ['version'])],
];

for (const [label, result] of checks) {
  printStatus(label, result.ok ? 'ok' : 'missing', result.output || 'not found');
}

console.log('');

const nodeMajor = getNodeMajor();
if (nodeMajor === ciNodeMajor) {
  printStatus('node parity', 'ok', `local Node ${nodeMajor} matches CI Node ${ciNodeMajor}`);
} else {
  printStatus(
    'node parity',
    'warn',
    `local Node ${nodeMajor} differs from CI Node ${ciNodeMajor}; align local runtime before trusting parity-sensitive Vercel behavior`,
  );
}

const vercelProjectPath = path.join(repoRoot, '.vercel', 'project.json');
printStatus(
  'vercel link',
  hasFile(vercelProjectPath) ? 'ok' : 'missing',
  hasFile(vercelProjectPath) ? vercelProjectPath : 'missing .vercel/project.json',
);

const previewWorkflow = path.join(repoRoot, '.github', 'workflows', 'preview-qa.yml');
printStatus(
  'manual preview workflow',
  hasFile(previewWorkflow) ? 'ok' : 'missing',
  hasFile(previewWorkflow) ? 'workflow_dispatch preview verification configured' : 'missing',
);

const autoPreviewWorkflow = path.join(repoRoot, '.github', 'workflows', 'preview-qa-auto.yml');
printStatus(
  'auto preview workflow',
  hasFile(autoPreviewWorkflow) ? 'ok' : 'warn',
  hasFile(autoPreviewWorkflow)
    ? 'deployment_status preview verification configured'
    : 'automatic Vercel deployment verification is not configured yet',
);

const windowsCursorPath = '/mnt/c/Users/mabro/AppData/Local/Programs/Cursor/Cursor.exe';
printStatus(
  'cursor bridge',
  hasFile(windowsCursorPath) ? 'ok' : 'missing',
  hasFile(windowsCursorPath) ? windowsCursorPath : 'Cursor.exe not found at expected host path',
);

const windowsVercelAuth = '/mnt/c/Users/mabro/AppData/Roaming/com.vercel.cli/Data/auth.json';
const wslVercelAuth = '/home/claw/.vercel/auth.json';
const windowsVercelConfig = '/mnt/c/Users/mabro/AppData/Roaming/com.vercel.cli/Data/config.json';
const wslVercelConfig = '/home/claw/.vercel/config.json';
const authJson = readJson(wslVercelAuth) || readJson(windowsVercelAuth) || {};
const configJson = readJson(wslVercelConfig) || readJson(windowsVercelConfig) || {};
const hasVercelToken = Boolean(
  authJson.token ||
    authJson.accessToken ||
    authJson.credentials ||
    configJson.token ||
    configJson.accessToken,
);
const vercelWhoAmI = commandCheck('vercel', ['whoami']);
printStatus(
  'vercel auth bridge',
  vercelWhoAmI.ok || hasVercelToken
    ? 'ok'
    : hasFile(wslVercelAuth) || hasFile(windowsVercelAuth)
      ? 'warn'
      : 'missing',
  vercelWhoAmI.ok
    ? `authenticated as ${vercelWhoAmI.output}`
    : hasVercelToken
      ? 'Vercel credentials available to WSL'
    : hasFile(wslVercelAuth) || hasFile(windowsVercelAuth)
      ? 'Vercel files exist, but no usable token was detected; run `vercel login` in WSL'
      : 'no Vercel auth file found',
);

const stitchConfig = '/mnt/c/Users/mabro/.stitch-mcp/config';
printStatus(
  'stitch mcp footprint',
  hasFile(stitchConfig) ? 'ok' : 'warn',
  hasFile(stitchConfig) ? stitchConfig : 'local Stitch MCP config directory not found',
);

console.log('');
console.log('Recommended next actions:');
console.log('- Run `npm run env:check -- preview` before relying on preview QA.');
console.log('- Run `npm run vercel:whoami` to confirm the active Vercel account before pulling envs.');
console.log('- Run `npm run qa:preview -- --url <preview-url>` after a successful Vercel deployment.');
