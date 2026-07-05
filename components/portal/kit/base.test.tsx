import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { StatusTag } from './StatusTag';
import { StatTile } from './StatTile';
import { cx } from './base';

describe('KitBaseProps contract', () => {
  it('cx joins truthy classes in order (consumer last)', () => {
    expect(cx('a', undefined, 'b', false, 'consumer')).toBe('a b consumer');
  });

  it('StatusTag passes through className, style, ref, and data-*', () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <StatusTag tone="ok" className="wa-ml-2" style={{ marginTop: 4 }} ref={ref} data-testid="tag">
        Active
      </StatusTag>
    );
    const el = screen.getByTestId('tag');
    expect(ref.current).toBe(el);
    // Internal classes first, consumer class last.
    expect(el.className).toBe('wa-kit-tag wa-kit-tag--ok wa-ml-2');
    expect(el.style.marginTop).toBe('4px');
  });

  it('StatTile keeps internal card classes and appends consumer className', () => {
    render(<StatTile label="Members" value={42} data-testid="tile" className="custom" />);
    const el = screen.getByTestId('tile');
    expect(el.className).toContain('wa-kit-card');
    expect(el.className.endsWith('custom')).toBe(true);
  });
});
