import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function Trap({ active, onEscape, label }: { active: boolean; onEscape?: () => void; label: string }) {
  const ref = useFocusTrap<HTMLDivElement>(active, { onEscape, skipInitialFocus: true });
  return (
    <div ref={ref} data-testid={label}>
      <button>{label}-first</button>
      <button>{label}-last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('wraps Tab from last to first and Shift+Tab from first to last', () => {
    render(<Trap active label="trap" />);
    const first = screen.getByText('trap-first');
    const last = screen.getByText('trap-last');

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('escape stack: only the top-most trap consumes Escape', () => {
    const outerEscape = vi.fn();
    const innerEscape = vi.fn();
    render(
      <>
        <Trap active onEscape={outerEscape} label="outer" />
        <Trap active onEscape={innerEscape} label="inner" />
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(innerEscape).toHaveBeenCalledTimes(1);
    expect(outerEscape).not.toHaveBeenCalled();
  });

  it('falls through to the next trap once the top one deactivates', () => {
    const outerEscape = vi.fn();
    const innerEscape = vi.fn();
    const { rerender } = render(
      <>
        <Trap active onEscape={outerEscape} label="outer" />
        <Trap active onEscape={innerEscape} label="inner" />
      </>
    );

    rerender(
      <>
        <Trap active onEscape={outerEscape} label="outer" />
        <Trap active={false} onEscape={innerEscape} label="inner" />
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(innerEscape).not.toHaveBeenCalled();
    expect(outerEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape during IME composition', () => {
    const onEscape = vi.fn();
    render(<Trap active onEscape={onEscape} label="trap" />);

    fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('restores focus to the previously focused element on deactivate', () => {
    const { rerender } = render(
      <>
        <button data-testid="trigger">open</button>
        <Trap active={false} label="trap" />
      </>
    );
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(
      <>
        <button data-testid="trigger">open</button>
        <Trap active label="trap" />
      </>
    );
    screen.getByText('trap-first').focus();

    rerender(
      <>
        <button data-testid="trigger">open</button>
        <Trap active={false} label="trap" />
      </>
    );
    expect(document.activeElement).toBe(trigger);
  });
});
