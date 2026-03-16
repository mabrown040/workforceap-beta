import PortalNav from '@/components/portal/PortalNav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalNav />
      {children}
    </>
  );
}
