import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailTemplatesClient from './EmailTemplatesClient';

const mockTemplates = [
  {
    id: 'tpl-1',
    key: 'welcome-member',
    name: 'Welcome Member',
    subject: 'Welcome {firstName}',
    body: '<p>Hi {firstName}</p>',
    variables: ['firstName'],
    active: true,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-10T00:00:00Z',
  },
  {
    id: 'tpl-2',
    key: 'inactive-nudge',
    name: 'Inactive Nudge',
    subject: 'We miss you',
    body: '<p>Come back</p>',
    variables: [],
    active: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-10T00:00:00Z',
  },
];

describe('EmailTemplatesClient', () => {
  it('renders template list', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    expect(screen.getByText('Welcome Member')).toBeInTheDocument();
    expect(screen.getByText('Inactive Nudge')).toBeInTheDocument();
  });

  it('filters templates by search', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    const input = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(input, { target: { value: 'welcome' } });
    expect(screen.getByText('Welcome Member')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Nudge')).not.toBeInTheDocument();
  });

  it('shows inactive badge for inactive templates', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('opens edit modal when edit is clicked', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByText('Welcome Member'));
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByText('Edit Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Welcome Member')).toBeInTheDocument();
  });

  it('shows empty state when search matches nothing', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    const input = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText(/no templates match your search/i)).toBeInTheDocument();
  });

  it('shows select-a-template placeholder initially', () => {
    render(<EmailTemplatesClient templates={mockTemplates} adminEmail="admin@example.com" />);
    expect(screen.getByText('Select a template')).toBeInTheDocument();
  });
});
