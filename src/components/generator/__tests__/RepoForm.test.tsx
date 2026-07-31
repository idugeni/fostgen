import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { RepoForm, type RepoFormValues } from '@/components/generator/RepoForm';

function Harness({
  onSubmit = jest.fn(),
  onReset = jest.fn(),
  loading = false,
  canReset = false,
  validationMessage,
  initial,
}: {
  onSubmit?: () => void;
  onReset?: () => void;
  loading?: boolean;
  canReset?: boolean;
  validationMessage?: string;
  initial?: Partial<RepoFormValues>;
}) {
  const [values, setValues] = useState<RepoFormValues>({
    url: '',
    ref: '',
    path: '',
    ...initial,
  });

  return (
    <RepoForm
      values={values}
      onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      onSubmit={onSubmit}
      onReset={onReset}
      loading={loading}
      canReset={canReset}
      {...(validationMessage ? { validationMessage } : {})}
    />
  );
}

const urlField = () => screen.getByLabelText(/github repository/i);

describe('RepoForm', () => {
  it('renders an accessible, labelled URL field', () => {
    render(<Harness />);

    expect(urlField()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeEnabled();
  });

  it('reports what the user types through onChange', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(urlField(), 'owner/repo');
    expect(urlField()).toHaveValue('owner/repo');
  });

  it('submits when the form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(urlField(), 'owner/repo');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits on Enter without reloading the page', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(urlField(), 'owner/repo{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('fills the field from an example chip', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'vercel/next.js' }));
    expect(urlField()).toHaveValue('vercel/next.js');
  });

  it('disables the submit button and announces progress while loading', () => {
    render(<Harness loading />);

    const submit = screen.getByRole('button', { name: /generating/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the clear button only when there is something to clear', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();

    const { rerender } = render(<Harness onReset={onReset} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

    rerender(<Harness onReset={onReset} canReset />);
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('links a validation message to the field for screen readers', () => {
    render(<Harness validationMessage="That is not a GitHub repository." />);

    const field = urlField();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('That is not a GitHub repository.');
    expect(field).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
  });

  it('reveals the branch and sub-directory fields on demand', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole('button', { name: /branch & sub-directory/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/branch, tag or commit/i)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.type(screen.getByLabelText(/branch, tag or commit/i), 'develop');
    expect(screen.getByLabelText(/branch, tag or commit/i)).toHaveValue('develop');
  });

  it('starts expanded when a branch or path is already set', () => {
    render(<Harness initial={{ ref: 'develop' }} />);

    expect(screen.getByRole('button', { name: /branch & sub-directory/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByLabelText(/branch, tag or commit/i)).toHaveValue('develop');
  });
});
