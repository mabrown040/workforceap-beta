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
    expect(el.className).toBe('wa-ml-2');
    expect(el.style.marginTop).toBe('4px');
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('StatTile keeps consumer className on the outer wrapper', () => {
    render(<StatTile label="Members" value={42} data-testid="tile" className="custom" />);
    const el = screen.getByTestId('tile');
    expect(el.className).toBe('custom');
  });
});
