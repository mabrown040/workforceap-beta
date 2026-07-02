import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageToggle from './LanguageToggle';

const mockReplace = vi.fn();
const mockReload = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/es/about',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/i18n/client', () => ({
  setLocaleCookie: vi.fn(),
}));

describe('LanguageToggle', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockReload.mockClear();
    vi.stubGlobal('location', { reload: mockReload });
  });

  it('renders all language options', () => {
    render(<LanguageToggle />);
    expect(screen.getByLabelText('selectLanguage')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
    // FR/PT are gated behind REVIEWED_LOCALES until their translations pass
    // human review — only reviewed languages are offered.
    expect(screen.queryByRole('option', { name: 'Français' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Português' })).not.toBeInTheDocument();
  });

  it('sets current locale from pathname', () => {
    render(<LanguageToggle />);
    const select = screen.getByLabelText('selectLanguage') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('switches locale on prefixed path via router.replace', () => {
    render(<LanguageToggle />);
    const select = screen.getByLabelText('selectLanguage');
    fireEvent.change(select, { target: { value: 'es' } });
    expect(mockReplace).toHaveBeenCalledWith('/es/about');
  });

});
