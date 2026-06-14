import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const { fill, priority, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element -- Test mock for next/image renders a plain img so assertions can inspect DOM attributes.
    return <img {...rest} alt={alt ?? ''} data-fill={fill} data-priority={priority} />;
  },
}));

describe('HeroSection', () => {
  it('renders headline', () => {
    render(<HeroSection headline={<h1>Test Headline</h1>} />);
    expect(screen.getByRole('heading', { name: /test headline/i })).toBeInTheDocument();
  });

  it('renders eyebrow when provided', () => {
    render(
      <HeroSection
        eyebrow={<span>Eyebrow Text</span>}
        headline={<h1>Headline</h1>}
      />
    );
    expect(screen.getByText('Eyebrow Text')).toBeInTheDocument();
  });

  it('renders subheadline when provided', () => {
    render(
      <HeroSection
        headline={<h1>Headline</h1>}
        subheadline={<p>Subheadline content</p>}
      />
    );
    expect(screen.getByText('Subheadline content')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <HeroSection headline={<h1>Headline</h1>}>
        <button>CTA Button</button>
      </HeroSection>
    );
    expect(screen.getByRole('button', { name: /cta button/i })).toBeInTheDocument();
  });

  it('renders background image when provided', () => {
    const { container } = render(
      <HeroSection
        headline={<h1>Headline</h1>}
        backgroundImage="/hero-bg.jpg"
        priority
      />
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/hero-bg.jpg');
    expect(img).toHaveAttribute('sizes', '(min-width: 1921px) 1920px, 100vw');
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(
      <HeroSection headline={<h1>Headline</h1>} className="custom-hero" />
    );
    expect(container.querySelector('section')).toHaveClass('custom-hero');
  });

  it('does not render image when backgroundImage is omitted', () => {
    render(<HeroSection headline={<h1>Headline</h1>} />);
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });
});
