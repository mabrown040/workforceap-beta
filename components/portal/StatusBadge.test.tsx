import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import StatusBadge from './StatusBadge';

/**
 * Behavioural contrast check for the shared status pill.
 *
 * The pill's variant styles are `var(--wa-*)` references into the portal token
 * layer (css/portal-tokens.css), where every mode-dependent token is a single
 * `light-dark(light, dark)` declaration. This test resolves the rendered pill's
 * foreground/background tokens through that file for each colour scheme,
 * composites translucent tints over the surfaces the pill actually sits on,
 * and asserts WCAG AA (4.5:1) for small bold text. It fails if the component
 * points at a token that does not exist, or if a token's value drifts so the
 * pair no longer reads.
 */

type Rgba = { r: number; g: number; b: number; a: number };
type Scheme = 'light' | 'dark';

const TOKENS_CSS = readFileSync(path.join(__dirname, '../../css/portal-tokens.css'), 'utf8');

/** `--name: value;` declarations from the token file (first :root block). */
function loadTokens(): Map<string, string> {
  const root = TOKENS_CSS.slice(TOKENS_CSS.indexOf(':root {'));
  const block = root.slice(0, root.indexOf('\n}\n'));
  const out = new Map<string, string>();
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) out.set(`--${m[1]}`, m[2].trim());
  return out;
}

function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of args) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

/** Resolve a CSS colour expression (var(), light-dark(), hex, rgb[a]) to a colour string. */
function resolve(expr: string, tokens: Map<string, string>, scheme: Scheme, depth = 0): string {
  if (depth > 10) throw new Error(`token cycle while resolving ${expr}`);
  const value = expr.trim();
  const varMatch = value.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
  if (varMatch) {
    const tokenValue = tokens.get(varMatch[1]);
    if (tokenValue === undefined) throw new Error(`token ${varMatch[1]} is not defined in css/portal-tokens.css`);
    return resolve(tokenValue, tokens, scheme, depth + 1);
  }
  const ld = value.match(/^light-dark\((.+)\)$/);
  if (ld) {
    const [light, dark] = splitTopLevel(ld[1]);
    return resolve(scheme === 'light' ? light : dark, tokens, scheme, depth + 1);
  }
  return value;
}

function parseColor(value: string): Rgba {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(/[\s,/]+/).filter(Boolean);
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`unsupported colour value: ${value}`);
}

function over(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function renderedStyle(variant: 'warning') {
  const { container } = render(<StatusBadge label="In review" variant={variant} />);
  const el = container.firstElementChild as HTMLElement;
  return { color: el.style.color, background: el.style.background || el.style.backgroundColor };
}

describe('StatusBadge warning variant contrast', () => {
  const tokens = loadTokens();
  const surfaces = ['--wa-surface', '--wa-bg'] as const;

  it.each<Scheme>(['light', 'dark'])('meets 4.5:1 on portal surfaces in %s mode', (scheme) => {
    const { color, background } = renderedStyle('warning');
    expect(color).toMatch(/^var\(--wa-/);
    expect(background).toMatch(/^var\(--wa-/);

    const fg = parseColor(resolve(color, tokens, scheme));
    const tint = parseColor(resolve(background, tokens, scheme));

    for (const surface of surfaces) {
      const behind = parseColor(resolve(`var(${surface})`, tokens, scheme));
      const bg = tint.a < 1 ? over(tint, behind) : tint;
      const ratio = contrast(fg, bg);
      expect(ratio, `${scheme} warning pill on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
