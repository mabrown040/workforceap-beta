import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminCronsClient, { type CronExecutionRow } from './AdminCronsClient';

const mockExecutions: CronExecutionRow[] = [
  {
    id: '1',
    jobName: 'sync-coursera',
    status: 'SUCCESS',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:05:00Z'),
    errorMessage: null,
    recordsProcessed: 42,
    durationMs: 300000,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    jobName: 'email-digest',
    status: 'FAILED',
    startedAt: new Date('2024-01-01T11:00:00Z'),
    completedAt: new Date('2024-01-01T11:01:00Z'),
    errorMessage: 'SMTP connection timeout',
    recordsProcessed: null,
    durationMs: 60000,
    createdAt: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: '3',
    jobName: 'sync-coursera',
    status: 'RUNNING',
    startedAt: new Date('2024-01-01T12:00:00Z'),
    completedAt: null,
    errorMessage: null,
    recordsProcessed: null,
    durationMs: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
  },
];

const jobNames = ['sync-coursera', 'email-digest', 'cleanup-old-data'];

describe('AdminCronsClient', () => {
  it('renders cron list with status badges', () => {
    const { container } = render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0]!).toHaveTextContent('sync-coursera');
    expect(rows[1]!).toHaveTextContent('email-digest');
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('filters by job name', () => {
    const { container } = render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const select = screen.getAllByRole('combobox')[0]!;
    fireEvent.change(select, { target: { value: 'email-digest' } });
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent('email-digest');
    expect(rows[0]!).toHaveTextContent('FAILED');
  });

  it('filters by status', () => {
    const { container } = render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const select = screen.getAllByRole('combobox')[1]!;
    fireEvent.change(select, { target: { value: 'SUCCESS' } });
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent('sync-coursera');
    expect(rows[0]!).toHaveTextContent('SUCCESS');
  });

  it('shows empty message when filters match nothing', () => {
    render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'cleanup-old-data' } });
    expect(screen.getByText(/no executions match the current filters/i)).toBeInTheDocument();
  });

  it('clears filters when clear button is clicked', () => {
    const { container } = render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const select = screen.getAllByRole('combobox')[0]!;
    fireEvent.change(select, { target: { value: 'email-digest' } });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('tbody tr')!).toHaveTextContent('email-digest');

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('shows error details toggle', () => {
    render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    const viewErrorBtn = screen.getByRole('button', { name: /view error/i });
    expect(viewErrorBtn).toBeInTheDocument();

    fireEvent.click(viewErrorBtn);
    expect(screen.getByText('SMTP connection timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument();
  });

  it('renders duration correctly', () => {
    render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    expect(screen.getByText('300.0s')).toBeInTheDocument();
    expect(screen.getByText('60.0s')).toBeInTheDocument();
  });

  it('renders records processed', () => {
    render(<AdminCronsClient initialExecutions={mockExecutions} jobNames={jobNames} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
