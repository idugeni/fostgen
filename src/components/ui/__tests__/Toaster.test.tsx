import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ToastProvider, useToast } from '@/components/ui/Toaster';

function Harness() {
  const { notify, toasts, dismiss } = useToast();

  return (
    <div>
      <button type="button" onClick={() => notify.success('Saved')}>
        success
      </button>
      <button
        type="button"
        onClick={() => notify.error({ title: 'Boom', description: 'Try again' })}
      >
        error
      </button>
      <button type="button" onClick={() => notify.info({ title: 'Sticky', duration: 0 })}>
        sticky
      </button>
      <button type="button" onClick={() => toasts.forEach((toast) => dismiss(toast.id))}>
        dismiss all
      </button>
      {/* A plain span: <output> carries an implicit role="status". */}
      <span data-testid="count">{toasts.length}</span>
    </div>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  it('throws a helpful error when used outside the provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(/useToast must be used inside/);
    consoleError.mockRestore();
  });

  it('renders a success toast with role=status', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'success' }));

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Saved');
  });

  it('renders errors with role=alert and a description', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'error' }));

    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent('Boom');
    expect(toast).toHaveTextContent('Try again');
  });

  it('auto-dismisses after the default duration', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderHarness();

      await user.click(screen.getByRole('button', { name: 'success' }));
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(screen.getByTestId('count')).toHaveTextContent('0');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps a toast with duration 0 until it is dismissed', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderHarness();

      await user.click(screen.getByRole('button', { name: 'sticky' }));
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      await user.click(screen.getByRole('button', { name: /dismiss: sticky/i }));
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    } finally {
      jest.useRealTimers();
    }
  });

  it('caps the number of simultaneously visible toasts', async () => {
    const user = userEvent.setup();
    renderHarness();

    const sticky = screen.getByRole('button', { name: 'sticky' });
    for (let index = 0; index < 6; index += 1) {
      await user.click(sticky);
    }

    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  it('exposes a live region so additions are announced', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'success' }));

    const region = screen.getByRole('status').parentElement;
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
