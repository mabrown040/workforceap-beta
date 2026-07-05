import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useListFocus, LIST_ITEM_ATTR } from './useListFocus';

const itemProps = { [LIST_ITEM_ATTR]: true } as Record<string, boolean>;

function List({
  orientation = 'vertical',
  loop = true,
  items = ['a', 'b', 'c'],
}: {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  items?: string[];
}) {
  const { containerRef, onKeyDown } = useListFocus<HTMLDivElement>({ orientation, loop });
  return (
    <div ref={containerRef} onKeyDown={onKeyDown} data-testid="list">
      {items.map((label) => (
        <button key={label} {...itemProps}>
          {label}
        </button>
      ))}
    </div>
  );
}

describe('useListFocus', () => {
  it('keeps exactly one item tabbable (roving tabindex)', () => {
    render(<List />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });

  it('ArrowDown moves focus and the tab stop; wraps at the end', () => {
    render(<List />);
    const [a, b, , /* c */] = screen.getAllByRole('button');
    a.focus();

    fireEvent.keyDown(a, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(b);
    expect(b.tabIndex).toBe(0);
    expect(a.tabIndex).toBe(-1);

    fireEvent.keyDown(b, { key: 'ArrowDown' });
    const c = screen.getByText('c');
    fireEvent.keyDown(c, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(a); // wrapped
  });

  it('does not wrap when loop=false', () => {
    render(<List loop={false} />);
    const buttons = screen.getAllByRole('button');
    const c = buttons[2];
    c.focus();
    fireEvent.keyDown(c, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(c);
  });

  it('Home and End jump to the first and last items', () => {
    render(<List />);
    const [a, b, c] = screen.getAllByRole('button');
    b.focus();
    fireEvent.keyDown(b, { key: 'End' });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c, { key: 'Home' });
    expect(document.activeElement).toBe(a);
  });

  it('horizontal orientation uses ArrowRight/ArrowLeft and ignores ArrowDown', () => {
    render(<List orientation="horizontal" />);
    const [a, b] = screen.getAllByRole('button');
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(a);
  });

  it('repairs tab stops when items change', () => {
    const { rerender } = render(<List items={['a', 'b']} />);
    rerender(<List items={['x', 'y', 'z']} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });
});
