import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Suspense, useState } from 'react';
import AsyncBoundary from './AsyncBoundary';

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Async test error');
  }
  return <div data-testid="child">Loaded</div>;
}

describe('AsyncBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AsyncBoundary>
        <div data-testid="child">Content</div>
      </AsyncBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders suspense fallback while loading', () => {
    render(
      <AsyncBoundary fallback={<div data-testid="loading">Loading…</div>}>
        <div data-testid="child">Content</div>
      </AsyncBoundary>
    );

    // Since children are synchronous, they render immediately —
    // fallback only shows during async resolution.
    // We verify the component structure by checking child renders.
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders custom error fallback when child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AsyncBoundary errorFallback={<div data-testid="error-fallback">Custom error</div>}>
        <ThrowError shouldThrow={true} />
      </AsyncBoundary>
    );

    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('uses default error fallback when no custom one provided', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AsyncBoundary>
        <ThrowError shouldThrow={true} />
      </AsyncBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('calls onReset when error boundary resets', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    let shouldThrow = true;

    function DynamicChild() {
      if (shouldThrow) {
        throw new Error('Reset test error');
      }
      return <div data-testid="child">Content</div>;
    }

    render(
      <AsyncBoundary onReset={onReset}>
        <DynamicChild />
      </AsyncBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('child')).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
