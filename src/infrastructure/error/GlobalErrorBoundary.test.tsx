import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

function ThrowingChild(): never {
  throw new Error('boom');
}

function WorkingChild() {
  return <div>All good</div>;
}

describe('GlobalErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <GlobalErrorBoundary>
        <WorkingChild />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('shows the fallback UI when a child throws during render', () => {
    // React logs the caught error to the console (both its own dev warning and
    // our componentDidCatch's own console.error) - expected noise for this test.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorBoundary>
        <ThrowingChild />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.queryByText('All good')).not.toBeInTheDocument();
  });

  it('exposes a reload control that triggers a page reload when activated', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <GlobalErrorBoundary>
        <ThrowingChild />
      </GlobalErrorBoundary>,
    );

    const button = screen.getByRole('button', { name: /reload page/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
