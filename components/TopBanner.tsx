import LocalizedLink from '@/components/LocalizedLink';

export default function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner-inner">
        <span>No-cost career training, certificates, and support for <LocalizedLink href="/apply" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</LocalizedLink>.</span>
        <LocalizedLink href="/apply" className="banner-link">Explore programs and apply today.</LocalizedLink>
      </div>
    </div>
  );
}
